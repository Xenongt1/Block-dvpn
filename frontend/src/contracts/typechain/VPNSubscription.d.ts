import { ethers } from 'ethers';
import type { BigNumberish } from 'ethers';

export interface VPNSubscription extends ethers.Contract {
  subscribe(): Promise<ethers.ContractTransaction>;
  isSubscriptionActive(tokenId: BigNumberish): Promise<boolean>;
  subscriptionFee(): Promise<BigNumberish>;
  getRemainingTime(user: string): Promise<BigNumberish>;
  hasActiveSubscription(user: string): Promise<boolean>;
} 