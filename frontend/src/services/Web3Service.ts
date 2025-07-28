import { ethers } from 'ethers';
import { VPNRegistry } from '../contracts/typechain/VPNRegistry';
import { VPNSubscription } from '../contracts/typechain/VPNSubscription';
import { getContractAddress } from '../config/contracts';
import VPNRegistryABI from '../contracts/VPNRegistry.json';
import VPNSubscriptionABI from '../contracts/VPNSubscription.json';

export interface Web3State {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

class Web3Service {
  private static instance: Web3Service;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private registry: VPNRegistry | null = null;
  private subscription: VPNSubscription | null = null;

  private constructor() {
    this.setupProviderListener();
  }

  static getInstance(): Web3Service {
    if (!Web3Service.instance) {
      Web3Service.instance = new Web3Service();
    }
    return Web3Service.instance;
  }

  private setupProviderListener(): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', () => this.handleAccountsChanged());
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }

  private async handleAccountsChanged(): Promise<void> {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        await this.connect();
      }
    }
  }

  async connect(): Promise<Web3State> {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Setup provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      const account = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      
      // Initialize contracts
      await this.initializeContracts();

      // Check admin status
      const isAdmin = this.registry ? await this.registry.admins(account) : false;
      const superAdmin = this.registry ? await this.registry.admin() : null;
      const isSuperAdmin = superAdmin?.toLowerCase() === account.toLowerCase();

      return {
        account,
        chainId: Number(network.chainId),
        isConnected: true,
        isAdmin: isAdmin || isSuperAdmin,
        isSuperAdmin
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  private async initializeContracts(): Promise<void> {
    if (!this.signer) throw new Error('Signer not initialized');

    const registryAddress = getContractAddress('11155111', 'VPNRegistry');
    const subscriptionAddress = getContractAddress('11155111', 'VPNSubscription');

    if (!registryAddress || !subscriptionAddress) {
      throw new Error('Contract addresses not found');
    }

    this.registry = new ethers.Contract(
      registryAddress,
      [
        'function admin() view returns (address)',
        'function admins(address) view returns (bool)',
        'function addAdmin(address) returns ()',
        'function removeAdmin(address) returns ()',
        'function approveNode(address) returns ()',
        'function deactivateNode(address) returns ()',
        'function getBestNode() view returns (address, uint256)',
        'function getNodeDetails(address) view returns (string, string, uint256, bool, bool, uint256)',
        'function getTopNodes(uint256) view returns (address[], uint256[])',
        'function getActiveNodes() view returns (address[])',
        'function registerNode(address, string) returns ()',
        'function updateNodeMetrics(address, uint256, uint256, uint256, uint256) returns ()',
        'function canAccessNodes(uint256) view returns (bool)',
        'function vpnSubscriptionContract() view returns (address)'
      ],
      this.signer
    ) as unknown as VPNRegistry;

    this.subscription = new ethers.Contract(
      subscriptionAddress,
      [
        'function subscribe() payable returns ()',
        'function unsubscribe() returns ()',
        'function isSubscribed(address) view returns (bool)',
        'function getSubscriptionExpiry(address) view returns (uint256)',
        'function getSubscriptionPrice() view returns (uint256)'
      ],
      this.signer
    ) as unknown as VPNSubscription;
  }

  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.registry = null;
    this.subscription = null;
  }

  getRegistry(): VPNRegistry | null {
    return this.registry;
  }

  getSubscription(): VPNSubscription | null {
    return this.subscription;
  }

  isConnected(): boolean {
    return this.provider !== null && this.signer !== null;
  }
}

export default Web3Service.getInstance(); 