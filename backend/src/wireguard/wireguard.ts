import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface WireGuardPeer {
  publicKey: string;
  allowedIPs?: string;
  endpoint?: string;
  latestHandshake?: string;
  persistentKeepalive?: number;
  transfer?: {
    received: string;
    sent: string;
  };
}

interface WireGuardStatus {
  interface: {
    publicKey: string;
    listeningPort: number;
  };
  peers: WireGuardPeer[];
}

interface PeerConfig {
  privateKey: string;
  publicKey: string;
  address: string;
  dns: string[];
  endpoint: string;
  serverPublicKey: string;
  allowedIPs: string[];
  persistentKeepalive: number;
}

export class WireGuardController {
  private vpnHost: string;
  private vpnUser: string;

  constructor() {
    // VPN node details
    this.vpnHost = '35.197.230.164';
    this.vpnUser = 'mbrktijani';
  }

  private async executeOnVPN(command: string): Promise<string> {
    try {
      const sshCommand = `ssh ${this.vpnUser}@${this.vpnHost} "${command}"`;
      console.log('Executing command:', sshCommand);
      const { stdout } = await execAsync(sshCommand);
      return stdout.trim();
    } catch (error) {
      console.error('Error executing command on VPN:', error);
      throw error;
    }
  }

  async setupConnection(userId: string): Promise<{ config: string; peer: WireGuardPeer }> {
    try {
      // Generate keys for the new peer
      const privateKey = await this.executeOnVPN('wg genkey');
      const publicKey = await this.executeOnVPN(`echo "${privateKey}" | wg pubkey`);
      
      // Get all peers and find the next available IP
      const peers = await this.getAllPeers();
      const nextIP = this.getNextAvailableIP(peers);

      // Add peer to WireGuard
      await this.executeOnVPN(`sudo wg set wg0 peer ${publicKey} allowed-ips ${nextIP} persistent-keepalive 25`);

      // Generate client config
      const config = await this.generateClientConfig(privateKey, publicKey, nextIP);

      const peer: WireGuardPeer = {
        publicKey,
        allowedIPs: nextIP,
        persistentKeepalive: 25
      };

      return { config, peer };
    } catch (error) {
      console.error('Error setting up WireGuard peer:', error);
      throw new Error('Failed to set up VPN connection');
    }
  }

  private getNextAvailableIP(peers: WireGuardPeer[]): string {
    // Start from 10.0.0.2 (10.0.0.1 is typically the server)
    let lastOctet = 2;
    const usedIPs = new Set(
      peers
        .map(p => p.allowedIPs)
        .filter((ip): ip is string => ip !== undefined)
        .map(ip => parseInt(ip.split('.')[3]))
    );

    while (usedIPs.has(lastOctet)) {
      lastOctet++;
    }

    return `10.0.0.${lastOctet}/32`;
  }

  private async generateClientConfig(privateKey: string, publicKey: string, clientIP: string): Promise<string> {
    // Get server public key
    const serverInfo = await this.executeOnVPN('sudo wg show wg0 public-key');
    const serverPublicKey = serverInfo.trim();

    return `[Interface]
PrivateKey = ${privateKey}
Address = ${clientIP}
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = ${serverPublicKey}
Endpoint = ${this.vpnHost}:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25`;
  }

  async removeConnection(publicKey: string): Promise<void> {
    try {
      await this.executeOnVPN(`sudo wg set wg0 peer ${publicKey} remove`);
    } catch (error) {
      console.error('Error removing WireGuard peer:', error);
      throw new Error('Failed to remove VPN connection');
    }
  }

  async getStatus(publicKey?: string): Promise<WireGuardStatus | WireGuardPeer> {
    try {
      if (publicKey) {
        const output = await this.executeOnVPN(`sudo wg show wg0 peer ${publicKey}`);
        return this.parsePeerStatus(output);
      } else {
        const output = await this.executeOnVPN('sudo wg show wg0 dump');
        return this.parseWireGuardStatus(output);
      }
    } catch (error) {
      console.error('Error getting WireGuard status:', error);
      throw new Error('Failed to get VPN status');
    }
  }

  private async getAllPeers(): Promise<WireGuardPeer[]> {
    const output = await this.executeOnVPN('sudo wg show wg0 dump');
    const status = this.parseWireGuardStatus(output);
    return status.peers;
  }

  private parsePeerStatus(output: string): WireGuardPeer {
    const lines = output.split('\n');
    const peer: Partial<WireGuardPeer> = {};

    lines.forEach(line => {
      if (line.includes('allowed ips:')) {
        peer.allowedIPs = line.split(':')[1].trim();
      } else if (line.includes('endpoint:')) {
        peer.endpoint = line.split(':')[1].trim();
      } else if (line.includes('latest handshake:')) {
        peer.latestHandshake = line.split(':')[1].trim();
      }
    });

    if (!peer.publicKey) {
      throw new Error('Invalid peer status: missing public key');
    }

    return peer as WireGuardPeer;
  }

  private parseWireGuardStatus(output: string): WireGuardStatus {
    const lines = output.split('\n');
    const status: WireGuardStatus = {
      interface: {
        publicKey: '',
        listeningPort: 51820
      },
      peers: []
    };

    lines.forEach(line => {
      const fields = line.split('\t');
      if (fields.length >= 4) {
        if (!status.interface.publicKey) {
          status.interface.publicKey = fields[0];
        } else {
          status.peers.push({
            publicKey: fields[0],
            allowedIPs: fields[3],
            endpoint: fields[2] || undefined,
            latestHandshake: fields[4] || undefined
          });
        }
      }
    });

    return status;
  }

  async updatePeerEndpoint(publicKey: string, endpoint: string): Promise<void> {
    try {
      await this.executeOnVPN(`sudo wg set wg0 peer ${publicKey} endpoint ${endpoint}`);
    } catch (error) {
      console.error('Error updating peer endpoint:', error);
      throw new Error('Failed to update peer endpoint');
    }
  }
} 