import { ethers, ContractTransactionResponse } from 'ethers';

export type VPNTokenContract = ethers.Contract & {
  balanceOf: (owner: string) => Promise<bigint>;
  transfer: (to: string, amount: bigint) => Promise<ContractTransactionResponse>;
  allowance: (owner: string, spender: string) => Promise<bigint>;
  approve: (spender: string, amount: bigint) => Promise<ContractTransactionResponse>;
  transferFrom: (from: string, to: string, amount: bigint) => Promise<ContractTransactionResponse>;
  payForService: (nodeAddress: string, amount: bigint) => Promise<ContractTransactionResponse>;
  registerNode: (nodeAddress: string) => Promise<ContractTransactionResponse>;
  getNodeStake: (nodeAddress: string) => Promise<bigint>;
};

export const VPNTokenABI = [
  // ERC20 standard functions
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  
  // VPN specific functions
  "function payForService(address nodeAddress, uint256 amount) returns (bool)",
  "function registerNode(address nodeAddress) returns (bool)",
  "function getNodeStake(address nodeAddress) view returns (uint256)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event NodeRegistered(address indexed nodeAddress, uint256 stake)",
  "event ServicePayment(address indexed user, address indexed node, uint256 amount)"
]; 