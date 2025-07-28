import { ethers } from 'ethers';
import type { BigNumberish } from 'ethers';

export interface VPNRegistry extends ethers.Contract {
  admin(): Promise<string>;
  admins(address: string): Promise<boolean>;
  addAdmin(address: string): Promise<ethers.ContractTransaction>;
  removeAdmin(address: string): Promise<ethers.ContractTransaction>;
  isAdmin(address: string): Promise<boolean>;
  approveNode(nodeAddress: string): Promise<ethers.ContractTransaction>;
  deactivateNode(nodeAddress: string): Promise<ethers.ContractTransaction>;
  getBestNode(): Promise<[string, BigNumberish]>;
  getNodeDetails(nodeAddress: string): Promise<[string, string, BigNumberish, boolean, boolean, BigNumberish]>;
  getTopNodes(count: number): Promise<[string[], BigNumberish[]]>;
  getActiveNodes(): Promise<string[]>;
  registerNode(nodeAddress: string, ipAddress: string): Promise<ethers.ContractTransaction>;
  updateNodeMetrics(
    nodeAddress: string,
    latency: BigNumberish,
    bandwidth: BigNumberish,
    uptime: BigNumberish,
    reliability: BigNumberish
  ): Promise<ethers.ContractTransaction>;
  canAccessNodes(tokenId: BigNumberish): Promise<boolean>;
  vpnSubscriptionContract(): Promise<string>;
} 