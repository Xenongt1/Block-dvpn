import { ethers, ContractTransactionResponse } from 'ethers';
import { SubscriptionService } from './SubscriptionService';

export interface ISubscriptionService {
  initialize(): Promise<void>;
  getSubscriptionPrice(): Promise<bigint>;
  getSubscriptionFee(): Promise<bigint>;  // Alias for getSubscriptionPrice
  subscribe(nodeAddress?: string): Promise<ContractTransactionResponse>;
  isSubscribed(userAddress: string, nodeAddress: string): Promise<boolean>;
  getSubscriptionEndTime(userAddress: string, nodeAddress: string): Promise<bigint>;
  getSubscriptionStartTime(userAddress: string, nodeAddress: string): Promise<bigint>;
  checkSubscription(userAddress: string): Promise<boolean>;
  getRemainingTime(address: string): Promise<number>;
  isAdmin(address: string): Promise<boolean>;
  isSuperAdmin(address: string): Promise<boolean>;
  addAdmin(address: string): Promise<boolean>;
  removeAdmin(address: string): Promise<boolean>;
  transferSuperAdmin(newSuperAdmin: string): Promise<boolean>;
  cancelSubscription(): Promise<boolean>;
}

export class SubscriptionServiceFactory {
  static instance: ISubscriptionService | null = null;

  static async getInstance(provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner): Promise<ISubscriptionService> {
    if (!this.instance) {
      this.instance = new SubscriptionService(provider, signer);
      await this.instance.initialize();
    }
    return this.instance;
  }

  static resetInstance(): void {
    this.instance = null;
  }
} 