import { ethers, Contract, Interface, ContractTransactionResponse } from 'ethers';
import { ISubscriptionService } from './SubscriptionServiceFactory';
import { getContractAddress, getNetworkName } from '../config/contracts';
import VPNSubscriptionABI from '../contracts/VPNSubscription.json';
import VPNRegistryABI from '../contracts/VPNRegistry.json';
import { VPNSubscription } from '../contracts/typechain/VPNSubscription';

// Create Interface instances from ABIs
const subscriptionInterface = new Interface(VPNSubscriptionABI);
const registryInterface = new Interface(VPNRegistryABI.abi);

interface RegistryContractMethods {
  isAdmin(address: string): Promise<boolean>;
  admin(): Promise<string>;
  addAdmin(address: string): Promise<ContractTransactionResponse>;
  removeAdmin(address: string): Promise<ContractTransactionResponse>;
  transferAdmin(newAdmin: string): Promise<ContractTransactionResponse>;
}

export class SubscriptionService implements ISubscriptionService {
  private provider: ethers.BrowserProvider;
  private signer: ethers.JsonRpcSigner;
  private contract: VPNSubscription | null = null;
  private registryContract: Contract & RegistryContractMethods | null = null;

  constructor(provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner) {
    this.provider = provider;
    this.signer = signer;
  }

  async initialize(): Promise<void> {
    try {
      const network = await this.provider.getNetwork();
      const chainId = network.chainId.toString();
      const contractAddress = getContractAddress(chainId, 'VPNSubscription');
      const registryAddress = getContractAddress(chainId, 'VPNRegistry');
      
      if (!contractAddress || !registryAddress) {
        throw new Error(`No contract addresses found for network ${getNetworkName(chainId)}`);
      }

      console.log('[Debug] Initializing contracts with addresses:', {
        subscription: contractAddress,
        registry: registryAddress
      });

      this.contract = new Contract(
        contractAddress,
        subscriptionInterface,
        this.signer
      ) as unknown as VPNSubscription;

      this.registryContract = new Contract(
        registryAddress,
        registryInterface,
        this.signer
      ) as Contract & RegistryContractMethods;

      // Verify contract initialization
      if (!this.contract || !this.registryContract) {
        throw new Error('Failed to initialize contracts');
      }

      // Test contract methods
      try {
        await this.contract.SUBSCRIPTION_PRICE();
        console.log('[Debug] Contract methods verified successfully');
      } catch (error) {
        console.error('[Debug] Contract method verification failed:', error);
        throw new Error('Contract method verification failed');
      }
    } catch (error) {
      console.error('[Debug] Failed to initialize SubscriptionService:', error);
      throw error;
    }
  }

  async getSubscriptionPrice(): Promise<bigint> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    return await this.contract.SUBSCRIPTION_PRICE();
  }

  async subscribe(nodeAddress?: string): Promise<ContractTransactionResponse> {
    console.log('[Debug] Starting subscription process...');
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    let value: bigint = BigInt(0);
    try {
      value = await this.contract.SUBSCRIPTION_PRICE();
      console.log('[Debug] Subscription price:', value.toString(), 'ETH');

      // Get gas estimate
      const gasEstimate = await this.contract.subscribe.estimateGas({ value });
      console.log('[Debug] Gas estimate:', gasEstimate.toString());

      // Add 20% buffer to gas estimate
      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

      // Send transaction with gas limit
      const tx = await this.contract.subscribe({
        value,
        gasLimit
      });
      return tx;
    } catch (error: any) {
      console.error('[Debug] Subscription error:', error);
      if (error.message.includes('insufficient funds')) {
        const balance = await this.provider.getBalance(await this.signer.getAddress());
        console.error('[Debug] User balance:', balance.toString());
        console.error('[Debug] Required value:', value.toString());
      }
      throw error;
    }
  }

  async isSubscribed(userAddress: string, nodeAddress: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    try {
      return await this.contract.hasActiveSubscription(userAddress);
    } catch (error) {
      console.error('[Debug] Error checking subscription:', error);
      return false;
    }
  }

  async getSubscriptionEndTime(userAddress: string, nodeAddress: string): Promise<bigint> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    const remainingTime = await this.contract.getRemainingTime(userAddress);
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    return currentTime + remainingTime;
  }

  async getSubscriptionStartTime(userAddress: string, nodeAddress: string): Promise<bigint> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    const endTime = await this.getSubscriptionEndTime(userAddress, nodeAddress);
    return endTime - BigInt(30 * 24 * 60 * 60); // Subtract 30 days in seconds
  }

  async checkSubscription(userAddress: string): Promise<boolean> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized');
    }
    return await this.contract.hasActiveSubscription(userAddress);
  }

  async getRemainingTime(address: string): Promise<number> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized');
    }
    const remainingTime = await this.contract.getRemainingTime(address);
    return Number(remainingTime);
  }

  async isAdmin(address: string): Promise<boolean> {
    if (!this.registryContract) {
      throw new Error('Registry contract not initialized');
    }
    return await this.registryContract.isAdmin(address);
  }

  async isSuperAdmin(address: string): Promise<boolean> {
    if (!this.registryContract) {
      throw new Error('Registry contract not initialized');
    }
    const admin = await this.registryContract.admin();
    return admin.toLowerCase() === address.toLowerCase();
  }

  async addAdmin(address: string): Promise<boolean> {
    if (!this.registryContract) {
      throw new Error('Registry contract not initialized');
    }
    try {
      const tx = await this.registryContract.addAdmin(address);
      // Wait for the transaction to be mined
      const receipt = await this.provider.waitForTransaction(tx.hash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      console.error('Failed to add admin:', error);
      return false;
    }
  }

  async removeAdmin(address: string): Promise<boolean> {
    if (!this.registryContract) {
      throw new Error('Registry contract not initialized');
    }
    try {
      const tx = await this.registryContract.removeAdmin(address);
      // Wait for the transaction to be mined
      const receipt = await this.provider.waitForTransaction(tx.hash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      console.error('Failed to remove admin:', error);
      return false;
    }
  }

  async getSubscriptionFee(): Promise<bigint> {
    return this.getSubscriptionPrice();
  }

  async transferSuperAdmin(newSuperAdmin: string): Promise<boolean> {
    if (!this.registryContract) {
      throw new Error('Registry contract not initialized');
    }
    try {
      const tx = await this.registryContract.transferAdmin(newSuperAdmin);
      const receipt = await this.provider.waitForTransaction(tx.hash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      console.error('Failed to transfer super admin:', error);
      return false;
    }
  }

  async cancelSubscription(): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }
    try {
      const tx = await this.contract.cancelSubscription();
      const receipt = await this.provider.waitForTransaction(tx.hash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return false;
    }
  }
} 