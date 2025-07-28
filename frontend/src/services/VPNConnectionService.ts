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

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        // Only retry on network-related errors
        if (!error.message?.includes('Network Error') && 
            !error.code?.includes('ERR_NETWORK')) {
          throw error;
        }
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }

  public async connectToNode(nodeAddress: string, nodeIP: string, userAddress: string): Promise<VPNConfig> {
    try {
      console.log('Getting VPN configuration from node:', { nodeAddress, nodeIP, userAddress });

      // Construct the node's API URL
      const nodeApiUrl = `http://${nodeIP}:8000/generate-peer`;
      
      // Call the node's API to generate peer configuration
      const response = await this.retryOperation(async () => {
        const result = await axios.post(nodeApiUrl, {
          user_id: userAddress
        }, {
          timeout: 10000 // 10 second timeout
        });

        if (!result.data || !result.data.config) {
          throw new Error('Invalid configuration received from node');
        }

        return result;
      });

      // Send the configuration to the tray app
      const filename = `vpn-config-${nodeAddress}.conf`;
      await webSocketService.activateVPN(response.data.config, filename);

      this.currentConnection = nodeAddress;

      return {
        config: response.data.config,
        nodeAddress,
        nodeIP
      };
    } catch (error: any) {
      console.error('Error getting VPN configuration:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        throw new Error('No active subscription found. Please subscribe to use the VPN service.');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please reconnect your wallet.');
      } else if (error.message.includes('Network Error')) {
        throw new Error('Failed to connect to VPN node. Please check your internet connection.');
      }
      
      throw new Error(error.response?.data?.error || 'Failed to get VPN configuration from node');
    }
  }

  public async deletePeer(nodeIP: string, userAddress: string): Promise<void> {
    try {
      // First deactivate the VPN tunnel through the tray app
      await webSocketService.deactivateVPN();

      // Then clean up the peer on the server side with retry mechanism
      const nodeUrl = `http://${nodeIP}:8000`;
      console.log('Deleting peer from VPN node:', nodeUrl);
      
      await this.retryOperation(async () => {
        await axios.post(`${nodeUrl}/delete-peer`, {
          user_id: userAddress
        });
      });
      
      this.currentConnection = null;
      console.log('Peer deleted successfully');
    } catch (error) {
      // If we fail to delete the peer on the server side, but already deactivated locally,
      // we'll log the error but not throw - the local cleanup is more important
      console.error('Failed to delete peer:', error);
      this.currentConnection = null;
      // Don't throw here - we've already cleaned up locally
    }
  }

  public getConnectedNode(): string | null {
    return this.currentConnection;
  }
}

export const vpnConnectionService = VPNConnectionService.getInstance(); 
