import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import crypto from 'crypto';

const execAsync = promisify(exec);

interface VPNSession {
  sessionId: string;      // Random identifier instead of user address
  nodeAddress: string;    // Public node address only
  startTime: number;
  isActive: boolean;
}

export class VPNService extends EventEmitter {
  private activeSessions: Map<string, VPNSession> = new Map();
  private readonly configDir: string;
  
  constructor() {
    super();
    this.configDir = path.join(process.cwd(), 'vpn-configs');
    this.initializeConfigDirectory();
  }

  private async initializeConfigDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create config directory:', error);
      throw error;
    }
  }

  private generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private async generateVPNConfig(nodeAddress: string, ip: string, port: number): Promise<string> {
    const configPath = path.join(this.configDir, `${crypto.randomBytes(8).toString('hex')}.ovpn`);
    const config = `
client
dev tun
proto udp
remote ${ip} ${port}
resolv-retry infinite
nobind
persist-key
persist-tun
cipher AES-256-GCM
auth SHA512
verb 3
key-direction 1
<ca>
# Add CA certificate here
</ca>
<cert>
# Add client certificate here
</cert>
<key>
# Add client key here
</key>
    `.trim();

    await fs.writeFile(configPath, config);
    return configPath;
  }

  async connectToNode(nodeAddress: string): Promise<string> {
    try {
      // Generate a random session ID instead of using user address
      const sessionId = this.generateSessionId();

      // Create session with minimal data
      const session: VPNSession = {
        sessionId,
        nodeAddress,
        startTime: Date.now(),
        isActive: true
      };

      this.activeSessions.set(sessionId, session);
      this.emit('session:created', { sessionId, nodeAddress });

      // Clean up old sessions periodically
      this.cleanupOldSessions();

      return sessionId;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async disconnectFromNode(sessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('No active session found');
      }

      session.isActive = false;
      this.activeSessions.delete(sessionId);
      this.emit('session:ended', { sessionId });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async cleanupOldSessions(): Promise<void> {
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.startTime > TWO_HOURS) {
        await this.disconnectFromNode(sessionId);
      }
    }
  }

  // Public methods only return non-sensitive data
  getActiveSessionCount(): number {
    return Array.from(this.activeSessions.values()).filter(s => s.isActive).length;
  }

  isSessionActive(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    return session?.isActive || false;
  }

  getNodeConnectionStats(nodeAddress: string): { activeConnections: number } {
    const activeConnections = Array.from(this.activeSessions.values())
      .filter(s => s.nodeAddress === nodeAddress && s.isActive)
      .length;

    return { activeConnections };
  }
} 