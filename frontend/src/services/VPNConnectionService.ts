import axios from 'axios';
import { webSocketService } from './WebSocketService';

interface VPNConfig {
  config: string;
  nodeAddress: string;
  nodeIP: string;
}

export class VPNConnectionService {
  private static instance: VPNConnectionService;
  private currentConnection: string | null = null;

  private constructor() {}

  public static getInstance(): VPNConnectionService {
    if (!VPNConnectionService.instance) {
      VPNConnectionService.instance = new VPNConnectionService();
    }
    return VPNConnectionService.instance;
  }

  private async checkServerHealth(nodeUrl: string): Promise<boolean> {
    try {
      const response = await axios.get(`${nodeUrl}/health`, { timeout: 5000 });
      return response.data.status === 'ok';
    } catch (error) {
      console.error('Server health check failed:', error);
      return false;
    }
  }

  public async connectToNode(nodeAddress: string, nodeIP: string, userAddress: string): Promise<VPNConfig> {
    console.log('🔄 Starting VPN connection process:', { nodeAddress, nodeIP, userAddress });

    try {
      // Try HTTPS first
      try {
        console.log('📡 Attempting HTTPS connection to VPN node...');
        const response = await this.retryOperation(async () => {
          return await axios.post(`https://${nodeIP}:8000/generate-peer`, {
            user_id: userAddress
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
          });
        });

        if (response.status === 200) {
          console.log('✅ Successfully received VPN configuration via HTTPS:', {
            configReceived: !!response.data.config,
            peer_id: response.data.peer_id,
            nodeIP: response.data.nodeIP
          });

          // Send config to tray app
          if (response.data.config) {
            console.log('📡 Sending configuration to tray app...');
            const filename = `vpn-config-${nodeAddress}.conf`;
            await webSocketService.activateVPN(response.data.config, filename);
            console.log('✅ Configuration sent to tray app successfully');
          } else {
            throw new Error('No configuration received from VPN node');
          }

          return response.data;
        }
      } catch (httpsError) {
        console.log('⚠️ HTTPS attempt failed, trying HTTP:', httpsError);
        
        // Try HTTP as fallback
        console.log('📡 Attempting HTTP connection to VPN node...');
        const response = await this.retryOperation(async () => {
          return await axios.post(`http://${nodeIP}:8000/generate-peer`, {
            user_id: userAddress
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
          });
        });

        if (response.status === 200) {
          console.log('✅ Successfully received VPN configuration via HTTP:', {
            configReceived: !!response.data.config,
            peer_id: response.data.peer_id,
            nodeIP: response.data.nodeIP
          });

          // Send config to tray app
          if (response.data.config) {
            console.log('📡 Sending configuration to tray app...');
            const filename = `vpn-config-${nodeAddress}.conf`;
            await webSocketService.activateVPN(response.data.config, filename);
            console.log('✅ Configuration sent to tray app successfully');
          } else {
            throw new Error('No configuration received from VPN node');
          }

          return response.data;
        }
      }

      throw new Error('Failed to get VPN configuration from node');
    } catch (error) {
      console.error('❌ Error getting VPN configuration:', error);
      throw new Error('Failed to connect to VPN node. Please check your internet connection.');
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (i > 0) {
          console.log(`🔄 Retry attempt ${i + 1}/${maxRetries}...`);
        }
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.log(`⚠️ Attempt ${i + 1} failed:`, error.message);
        // Only retry on network-related errors
        if (!error.message?.includes('Network Error') && 
            !error.code?.includes('ERR_NETWORK')) {
          throw error;
        }
        if (i < maxRetries - 1) {
          const waitTime = delay * (i + 1);
          console.log(`⏳ Waiting ${waitTime/1000} seconds before next retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError;
  }

  public async deletePeer(nodeIP: string, userAddress: string): Promise<void> {
    try {
      console.log('🔄 Starting peer deletion process...');
      
      // First deactivate the VPN tunnel through the tray app
      console.log('📡 Sending deactivate command to tray app...');
      await webSocketService.deactivateVPN();
      console.log('✅ VPN tunnel deactivated successfully');

      // Then clean up the peer on the server side with retry mechanism
      console.log('📡 Deleting peer from VPN node:', nodeIP);
      
      // Try HTTPS first
      try {
        console.log('📡 Attempting HTTPS delete...');
        await this.retryOperation(async () => {
          await axios.post(`https://${nodeIP}:8000/delete-peer`, {
            user_id: userAddress
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
          });
        });
        console.log('✅ Peer deleted successfully via HTTPS');
      } catch (httpsError) {
        console.log('⚠️ HTTPS delete failed, trying HTTP:', httpsError);
        
        // Try HTTP as fallback
        console.log('📡 Attempting HTTP delete...');
        await this.retryOperation(async () => {
          await axios.post(`http://${nodeIP}:8000/delete-peer`, {
            user_id: userAddress
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
          });
        });
        console.log('✅ Peer deleted successfully via HTTP');
      }
      
      this.currentConnection = null;
      console.log('✅ Peer deletion completed');
    } catch (error) {
      // If we fail to delete the peer on the server side, but already deactivated locally,
      // we'll log the error but not throw - the local cleanup is more important
      console.error('⚠️ Failed to delete peer:', error);
      this.currentConnection = null;
      // Don't throw here - we've already cleaned up locally
    }
  }

  public getConnectedNode(): string | null {
    return this.currentConnection;
  }
}

export const vpnConnectionService = VPNConnectionService.getInstance(); 
