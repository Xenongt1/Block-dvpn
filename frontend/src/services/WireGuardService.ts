import axios from 'axios';
import { Buffer } from 'buffer';
import * as crypto from 'crypto';

// First, install these packages:
// npm install wireguard-tools buffer

interface VPNConfig {
  config: string;
  nodeAddress: string;
  nodeIP: string;
  qr_code?: string;
  connection_info?: {
    client_ip: string;
    server_endpoint: string;
    expires_at: string;
  };
  subscription?: {
    is_active: boolean;
    expiry_date: string;
    expiry_timestamp: number;
    remaining_time: number;
  };
}

interface ConnectionStatus {
  connected: boolean;
  client_ip?: string;
  subscription?: {
    is_active: boolean;
    expiry_date: string;
    expiry_timestamp: number;
    remaining_time: number;
  };
  last_connected?: string;
}

interface VPNNode {
  address: string;
  ipAddress: string;
  apiUrl: string;
  apiKey: string;
  publicKey: string;
  apiPort?: number;
  wireguardPort?: number;
  latency?: number;
  bandwidth?: number;
  uptime?: number;
  reliability?: number;
  totalScore?: number;
  country?: string;
  owner?: string;
  isActive?: boolean;
  isRegistered?: boolean;
}

interface WireGuardInterface {
  privateKey: string;
  publicKey: string;
  address: string;
  dns: string[];
}

interface WireGuardPeer {
  publicKey: string;
  allowedIPs: string[];
  endpoint: string;
  persistentKeepalive: number;
}

interface WireGuardConfig {
  interface: WireGuardInterface;
  peers: WireGuardPeer[];
}

interface InstallationInstructions {
  isInstalled: boolean;
  downloadUrl: string;
  instructions: string[];
}

interface ElectronAPI {
  activateConfig: (configBlob: Blob) => Promise<{ status: string; message?: string }>;
  disconnectVPN: () => Promise<{ status: string; message?: string }>;
  isElectronAvailable: () => boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export class WireGuardService {
  private nodes: Map<string, VPNNode> = new Map();
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private currentConfigBlob: Blob | null = null;
  
  // Known server details
  private readonly SERVER_PUBLIC_KEY = 'bUe6P3MbDPSihQLfEU3GQZD+IgCd+sPuGd5GN0r2Qi8=';
  private readonly SERVER_PORT = '51820';
  private readonly CLIENT_IP_PREFIX = '10.8.0.';

  constructor() {
    // Don't initialize with any default nodes
    // Nodes will be added dynamically when needed
  }

  addNode(node: VPNNode) {
    console.log('Adding node to WireGuardService:', node);
    this.nodes.set(node.address.toLowerCase(), node);
  }

  private generateKeyPair(): { privateKey: string; publicKey: string } {
    // Generate a new private key
    const privateKey = crypto.randomBytes(32);
    
    // Convert it to base64
    const privateKeyBase64 = privateKey.toString('base64');
    
    // Generate the corresponding public key using the private key
    const publicKey = crypto.createHash('sha256').update(privateKeyBase64).digest();
    const publicKeyBase64 = publicKey.toString('base64');
    
    return {
      privateKey: privateKeyBase64,
      publicKey: publicKeyBase64
    };
  }

  private generateClientIP(userId: string): string {
    // Generate a deterministic number between 2 and 254 based on the userId
    const hash = crypto.createHash('sha256').update(userId).digest();
    const number = (hash[0] + hash[1] * 256) % 253 + 2; // Ensures number between 2 and 254
    return `${this.CLIENT_IP_PREFIX}${number}`;
  }

  private async registerPeerWithNode(node: VPNNode, publicKey: string, clientIP: string, userId: string): Promise<boolean> {
    try {
      // Use the node's IP and API port for the request
      const nodeUrl = `http://${node.ipAddress}:${node.apiPort || 8000}`;
      console.log(`Attempting to register peer with node at ${nodeUrl}`);

      const response = await axios.post(`${nodeUrl}/generate-peer`, {
        user_id: userId
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data.config) {
        console.log('Peer registration successful:', response.data);
        return true;
      }
      
      throw new Error('Failed to register peer');
    } catch (error) {
      console.error('Error in registerPeerWithNode:', error);
      throw error;
    }
  }

  async connectToVPN(nodeAddress: string, userAddress: string, userId: string): Promise<VPNConfig> {
    try {
      console.log('Nodes in WireGuardService:', Array.from(this.nodes.entries()));
      
      // Find the node by address (case-insensitive)
      const node = this.nodes.get(nodeAddress.toLowerCase());
      console.log('Looking for node:', nodeAddress);
      console.log('Found node:', node);
      
      if (!node) {
        throw new Error(`VPN node not found for address: ${nodeAddress}`);
      }

      // Generate key pair and client IP
      const keys = this.generateKeyPair();
      const clientIP = this.generateClientIP(userId);

      // Register the peer with the VPN node
      console.log('Registering peer with VPN node...');
      const registered = await this.registerPeerWithNode(node, keys.publicKey, clientIP, userId);

      if (!registered) {
        throw new Error('Failed to register peer with VPN node');
      }

      // Generate WireGuard configuration using node's IP and WireGuard port
      const config = `[Interface]
PrivateKey = ${keys.privateKey}
Address = ${clientIP}/24
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = ${node.publicKey}
AllowedIPs = 0.0.0.0/0
Endpoint = ${node.ipAddress}:${node.wireguardPort || 51820}
PersistentKeepalive = 25`;

      return {
        config,
        nodeAddress: node.address,
        nodeIP: node.ipAddress
      };
    } catch (error) {
      console.error('Error in connectToVPN:', error);
      throw error;
    }
  }

  private setupWebSocket(nodeAddress: string, userId: string) {
    const node = this.nodes.get(nodeAddress);
    if (!node) {
      throw new Error('VPN node not found');
    }

    const wsUrl = node.apiUrl.replace('http', 'ws');
    this.ws = new WebSocket(`${wsUrl}/status?userId=${userId}`);

    this.ws.onopen = () => {
      console.log('WebSocket connection established');
      this.isConnected = true;
    };

    this.ws.onmessage = (event) => {
      const status = JSON.parse(event.data);
      this.handleStatusUpdate(status);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
      this.isConnected = false;
      // Attempt to reconnect after a delay
      setTimeout(() => this.setupWebSocket(nodeAddress, userId), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnected = false;
    };
  }

  private handleStatusUpdate(status: any) {
    // Handle status updates from the WebSocket
    // This can be extended to emit events or update UI components
    console.log('VPN Status Update:', status);
  }

  async disconnectFromVPN(nodeAddress: string, userId: string): Promise<void> {
    try {
      const node = this.nodes.get(nodeAddress);
      if (!node) {
        throw new Error('VPN node not found');
      }

      // Close WebSocket connection
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      this.isConnected = false;
    } catch (error) {
      console.error('Error disconnecting from VPN:', error);
      throw error;
    }
  }

  async getConnectionStatus(nodeAddress: string, userId: string): Promise<ConnectionStatus> {
    try {
      const node = this.nodes.get(nodeAddress);
      if (!node) {
        throw new Error('VPN node not found');
      }

      return {
        connected: this.isConnected,
        client_ip: this.generateClientIP(userId),
        subscription: {
          is_active: true,
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          expiry_timestamp: Date.now() + 30 * 24 * 60 * 60 * 1000,
          remaining_time: 30 * 24 * 60 * 60 * 1000
        }
      };
    } catch (error) {
      console.error('Error getting VPN status:', error);
      throw error;
    }
  }

  /**
   * Stores config silently for Electron activation without visible download
   * @param config - The WireGuard configuration string
   * @param filename - Optional filename for reference
   */
  async storeConfigSilently(config: string, filename: string = 'wireguard.conf'): Promise<void> {
    try {
      console.log('Storing config silently for Electron activation:', filename);
      
      // Create a blob from the config string and store it
      const blob = new Blob([config], { type: 'text/plain' });
      this.currentConfigBlob = blob;
      
      console.log('Config stored successfully for Electron activation');
    } catch (error: any) {
      console.error('Error storing config:', error);
      throw new Error(`Failed to store configuration: ${error.message}`);
    }
  }

  /**
   * Downloads config file visibly (kept for backward compatibility)
   * @deprecated Use storeConfigSilently() for Electron integration
   */
  async downloadConfig(config: VPNConfig, filename?: string): Promise<void> {
    try {
      // Use the nodeAddress to generate a unique filename if none provided
      const configFilename = filename || `vpn-config-${config.nodeAddress}.conf`;
      console.log('Downloading config file:', configFilename);
      
      // Create a blob from the config string
      const blob = new Blob([config.config], { type: 'text/plain' });
      this.currentConfigBlob = blob; // Store for Electron activation
      
      const url = window.URL.createObjectURL(blob);
      
      // Create a download link
      const link = document.createElement('a');
      link.href = url;
      link.download = configFilename;
      
      console.log('Triggering config file download');
      
      // Append link to body, click it, and remove it
      document.body.appendChild(link);
      link.click();
      
      // Small delay before cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Config file download completed');
    } catch (error: any) {
      console.error('Error downloading config:', error);
      throw new Error(`Failed to download configuration file: ${error.message}`);
    }
  }

  /**
   * Activates the downloaded config file through the Electron app
   * @returns Promise<boolean> - true if activation was successful
   */
  async activateConfigWithElectron(): Promise<boolean> {
    try {
      if (!this.currentConfigBlob) {
        throw new Error('No config file available. Please download a config first.');
      }

      if (!window.electronAPI) {
        throw new Error('Electron app is not available. Please run this in the Electron environment.');
      }

      console.log('Activating config with Electron app...');
      
      const result = await window.electronAPI.activateConfig(this.currentConfigBlob);
      
      if (result.status === 'connected') {
        console.log('Config activated successfully via Electron app');
        this.isConnected = true;
        return true;
      } else {
        throw new Error(result.message || 'Failed to activate config');
      }
    } catch (error: any) {
      console.error('Error activating config with Electron:', error);
      throw new Error(`Failed to activate config: ${error.message}`);
    }
  }

  /**
   * Deactivates the VPN connection through the Electron app
   * @returns Promise<boolean> - true if deactivation was successful
   */
  async deactivateConfigWithElectron(): Promise<boolean> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron app is not available. Please run this in the Electron environment.');
      }

      console.log('Deactivating VPN connection with Electron app...');
      
      const result = await window.electronAPI.disconnectVPN();
      
      if (result.status === 'disconnected') {
        console.log('VPN connection deactivated successfully via Electron app');
        this.isConnected = false;
        this.currentConfigBlob = null;
        return true;
      } else {
        throw new Error(result.message || 'Failed to deactivate VPN connection');
      }
    } catch (error: any) {
      console.error('Error deactivating config with Electron:', error);
      throw new Error(`Failed to deactivate VPN connection: ${error.message}`);
    }
  }

  /**
   * Checks if the Electron app is available
   * @returns boolean - true if Electron app is available
   */
  isElectronAvailable(): boolean {
    return !!(window.electronAPI && window.electronAPI.isElectronAvailable());
  }

  /**
   * Gets the current connection status
   * @returns boolean - true if connected
   */
  isCurrentlyConnected(): boolean {
    return this.isConnected;
  }

  private async detectWireGuardInstallation(): Promise<boolean> {
    try {
      // Try to detect WireGuard by checking if the protocol handler is registered
      const isRegistered = await new Promise<boolean>((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        let responded = false;
        
        // Set a timeout for the check
        setTimeout(() => {
          if (!responded) {
            responded = true;
            document.body.removeChild(iframe);
            resolve(false);
          }
        }, 1000);

        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.location.href = 'wireguard://';
            responded = true;
            document.body.removeChild(iframe);
            resolve(true);
          } else {
            responded = true;
            document.body.removeChild(iframe);
            resolve(false);
          }
        } catch (e) {
          if (!responded) {
            responded = true;
            document.body.removeChild(iframe);
            resolve(false);
          }
        }
      });

      return isRegistered;
    } catch (error) {
      console.error('Error detecting WireGuard:', error);
      return false;
    }
  }

  async checkWireGuardInstallation(): Promise<InstallationInstructions> {
    // Try to detect WireGuard installation
    const isWindows = navigator.platform.indexOf('Win') > -1;
    const isMac = navigator.platform.indexOf('Mac') > -1;
    const isLinux = navigator.platform.indexOf('Linux') > -1;

    let downloadUrl = '';
    let instructions: string[] = [];

    if (isWindows) {
      downloadUrl = 'https://download.wireguard.com/windows-client/wireguard-installer.exe';
      instructions = [
        '1. Download and run the WireGuard installer',
        '2. Open the WireGuard application',
        '3. Click "Import tunnel(s) from file"',
        '4. Select the downloaded .conf file',
        '5. Click "Activate" to connect'
      ];
    } else if (isMac) {
      downloadUrl = 'https://apps.apple.com/us/app/wireguard/id1451685025';
      instructions = [
        '1. Install WireGuard from the Mac App Store',
        '2. Open the WireGuard application',
        '3. Click the "+" button',
        '4. Choose "Import tunnel(s) from file"',
        '5. Select the downloaded .conf file',
        '6. Click "Activate" to connect'
      ];
    } else if (isLinux) {
      downloadUrl = 'https://www.wireguard.com/install/';
      instructions = [
        '1. Install WireGuard using your package manager:',
        '   Ubuntu/Debian: sudo apt install wireguard',
        '   Fedora: sudo dnf install wireguard-tools',
        '2. Copy the .conf file to /etc/wireguard/',
        '3. Run: sudo wg-quick up wg0'
      ];
    }

    // Try to detect if WireGuard is installed
    const isInstalled = await this.detectWireGuardInstallation();

    return {
      isInstalled,
      downloadUrl,
      instructions
    };
  }
} 