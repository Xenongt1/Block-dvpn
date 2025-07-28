import { ethers } from 'ethers';
import { getContracts } from '../config/contracts';
import axios from 'axios';

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

type VPNNodeResponse = {
  config: string;
  nodeAddress?: string;
  peer_id?: string;
  nodeIP: string;
  qr_code?: string;
  connection_info?: VPNConfig['connection_info'];
  subscription?: VPNConfig['subscription'];
};

export class VPNService {
  private provider: ethers.JsonRpcProvider;
  private vpnNodeUrl: string;
  private userId: string;

  constructor(provider: ethers.JsonRpcProvider, vpnNodeUrl: string, userId: string) {
    if (!provider) {
      throw new Error('Provider is required');
    }
    this.provider = provider;
    // Keep original protocol (http or https)
    this.vpnNodeUrl = vpnNodeUrl;
    if (!this.vpnNodeUrl.includes(':8000')) {
      this.vpnNodeUrl += ':8000';
    }
    this.userId = userId;
  }

  async checkSubscription(userAddress: string): Promise<boolean> {
    try {
      const { subscriptionContract } = getContracts(this.provider);
      if (!subscriptionContract) {
        throw new Error('Subscription contract not initialized');
      }
      return await subscriptionContract.hasActiveSubscription(userAddress);
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }

  async getVPNConfig(): Promise<VPNConfig | null> {
    try {
      // First verify subscription
      const signer = await this.provider.getSigner();
      const userAddress = await signer.getAddress();
      const hasSubscription = await this.checkSubscription(userAddress);
      
      if (!hasSubscription) {
        throw new Error('No active subscription found. Please subscribe to use the VPN service.');
      }

      console.log('Getting VPN configuration from node:', {
        nodeUrl: this.vpnNodeUrl,
        userId: this.userId
      });

      // Try both HTTPS and HTTP
      let response;
      let error: Error | null = null;

      // First try HTTPS
      try {
        const httpsUrl = this.vpnNodeUrl.replace('http://', 'https://');
        response = await axios.post(`${httpsUrl}/generate-peer`, {
          user_id: this.userId
        }, {
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        });
      } catch (e) {
        error = e instanceof Error ? e : new Error('Unknown error during HTTPS attempt');
        console.log('HTTPS attempt failed:', error.message);
      }

      // If HTTPS failed, try HTTP
      if (!response) {
        try {
          const httpUrl = this.vpnNodeUrl.replace('https://', 'http://');
          response = await axios.post(`${httpUrl}/generate-peer`, {
            user_id: this.userId
          }, {
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 10000
          });
        } catch (e) {
          error = e instanceof Error ? e : new Error('Unknown error during HTTP attempt');
          console.log('HTTP attempt failed:', error.message);
        }
      }

      // If both attempts failed
      if (!response) {
        throw error || new Error('Failed to connect to VPN node');
      }

      const result = response.data as VPNNodeResponse;
      
      // Extract the node address from the response
      const extractedNodeAddress = result.nodeAddress || result.peer_id || '';
      
      // Convert the node response to our VPNConfig format
      const vpnConfig: VPNConfig = {
        config: result.config,
        nodeAddress: extractedNodeAddress,
        nodeIP: result.nodeIP,
        qr_code: result.qr_code,
        connection_info: result.connection_info,
        subscription: result.subscription
      };

      return vpnConfig;
    } catch (error) {
      console.error('Failed to get VPN config:', error);
      throw error; // Re-throw to handle in the UI
    }
  }

  async downloadConfig(): Promise<void> {
    const config = await this.getVPNConfig();
    if (!config) {
      throw new Error('Failed to get VPN configuration');
    }

    // Create and download the .conf file
    const blob = new Blob([config.config], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vpn-config-${config.nodeAddress}.conf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async deletePeer(): Promise<void> {
    try {
      const response = await fetch(`${this.vpnNodeUrl}/delete-peer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: this.userId 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete peer configuration');
      }
    } catch (error) {
      console.error('Error deleting peer:', error);
      throw error;
    }
  }
} 