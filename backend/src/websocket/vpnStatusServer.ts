import WebSocket from 'ws';
import { Server } from 'http';
import { WireGuardController } from '../wireguard/wireguard';

interface StatusClient {
  userId: string;
  ws: WebSocket;
}

export class VPNStatusServer {
  private wss: WebSocket.Server;
  private clients: Map<string, StatusClient> = new Map();
  private statusInterval: NodeJS.Timeout | null = null;
  private wireguard: WireGuardController;

  constructor(server: Server) {
    this.wss = new WebSocket.Server({ server });
    this.wireguard = new WireGuardController();
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        ws.close(1008, 'User ID is required');
        return;
      }

      // Store the client connection
      this.clients.set(userId, { userId, ws });

      // Send initial status
      this.sendStatus(userId);

      ws.on('close', () => {
        this.clients.delete(userId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
        this.clients.delete(userId);
      });
    });

    // Start periodic status updates
    this.startStatusUpdates();
  }

  private async sendStatus(userId: string) {
    try {
      const client = this.clients.get(userId);
      if (!client) return;

      const status = await this.wireguard.getStatus(userId);
      client.ws.send(JSON.stringify(status));
    } catch (error) {
      console.error(`Error sending status to user ${userId}:`, error);
    }
  }

  private startStatusUpdates() {
    // Update status every 5 seconds
    this.statusInterval = setInterval(() => {
      this.clients.forEach((client) => {
        this.sendStatus(client.userId);
      });
    }, 5000);
  }

  public stop() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    this.wss.clients.forEach((client) => {
      client.close();
    });

    this.wss.close();
  }
} 