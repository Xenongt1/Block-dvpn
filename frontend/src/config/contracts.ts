import { ethers, JsonRpcProvider } from 'ethers';

interface NetworkConfig {
  VPNRegistry: string;
  VPNSubscription: string;
}

interface ContractConfig {
  [networkId: string]: NetworkConfig;
}

// Environment configuration
const ALCHEMY_API_KEY = process.env.REACT_APP_ALCHEMY_API_KEY || '';
const NETWORK = process.env.REACT_APP_NETWORK || 'sepolia';

// Network RPC URLs
const RPC_URLS = {
  sepolia: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  mainnet: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
};

// VPN Subscription contract interface
export interface VPNSubscriptionContract {
  SUBSCRIPTION_DURATION(): Promise<bigint>;
  SUBSCRIPTION_PRICE(): Promise<bigint>;
  getRemainingTime(user: string): Promise<bigint>;
  hasActiveSubscription(user: string): Promise<boolean>;
  getSubscriptionExpiry(tokenId: bigint): Promise<bigint>;
  balanceOf(owner: string): Promise<bigint>;
}

// VPN Registry contract interface
export interface VPNRegistryContract {
  getNodeDetails(nodeAddress: string): Promise<{
    ipAddress: string;
    owner: string;
    isApproved: boolean;
    isActive: boolean;
    metrics: {
      latency: bigint;
      bandwidth: bigint;
      uptime: bigint;
      reliability: bigint;
      totalScore: bigint;
    };
  }>;
  getActiveNodes(): Promise<string[]>;
  isNodeActive(nodeAddress: string): Promise<boolean>;
}

export const VPN_SUBSCRIPTION_ABI = [
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "hasActiveSubscription",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "getRemainingTime",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "SUBSCRIPTION_DURATION",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "SUBSCRIPTION_PRICE",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "getSubscriptionExpiry",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export const VPN_REGISTRY_ABI = [
    {
        "inputs": [{"name": "nodeAddress", "type": "address"}],
        "name": "getNodeDetails",
        "outputs": [
            {
                "components": [
                    {"name": "ipAddress", "type": "string"},
                    {"name": "owner", "type": "address"},
                    {"name": "isApproved", "type": "bool"},
                    {"name": "isActive", "type": "bool"},
                    {"name": "metrics", "type": "tuple", "components": [
                        {"name": "latency", "type": "uint256"},
                        {"name": "bandwidth", "type": "uint256"},
                        {"name": "uptime", "type": "uint256"},
                        {"name": "reliability", "type": "uint256"},
                        {"name": "totalScore", "type": "uint256"}
                    ]}
                ],
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getActiveNodes",
        "outputs": [{"name": "", "type": "address[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "nodeAddress", "type": "address"}],
        "name": "isNodeActive",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

interface ContractAddresses {
  [key: string]: {
    VPNRegistry: string;
    VPNSubscription: string;
  };
}

const CONTRACT_ADDRESSES: ContractAddresses = {
  // Sepolia testnet
  '11155111': {
    VPNRegistry: '0x103F744c4d064223AA0c6986d2465396F4F3e394',
    VPNSubscription: '0x516Fa3Ea215c372696e6D291F00f251f49904439'
  },
  // Mainnet (when ready)
  '1': {
    VPNRegistry: process.env.REACT_APP_VPN_REGISTRY_MAINNET || '',
    VPNSubscription: process.env.REACT_APP_VPN_SUBSCRIPTION_MAINNET || ''
  }
};

export const getContractAddress = (chainId: string, contractName: keyof ContractAddresses[string]): string => {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    throw new Error(`No contract addresses found for chain ID ${chainId}`);
  }
  const address = addresses[contractName];
  if (!address) {
    throw new Error(`${contractName} address not found for chain ID ${chainId}`);
  }
  return address;
};

export const isValidNetwork = (chainId: string): boolean => {
  return Object.keys(CONTRACT_ADDRESSES).includes(chainId);
};

export const getSupportedNetworks = (): string[] => {
  return Object.keys(CONTRACT_ADDRESSES);
};

export const getNetworkName = (chainId: string): string => {
  const networkNames: { [key: string]: string } = {
    '1': 'Ethereum Mainnet',
    '11155111': 'Sepolia'
  };
  return networkNames[chainId] || 'Unknown Network';
};

// Get provider instance
export const getProvider = () => {
  const network = NETWORK === 'mainnet' ? 'mainnet' : 'sepolia';
  return new ethers.JsonRpcProvider(RPC_URLS[network]);
};

// Get contract instances
export const getContracts = (provider: JsonRpcProvider) => {
  const networkId = (provider._network?.chainId || 11155111).toString();
  
  const subscriptionContract = new ethers.Contract(
    getContractAddress(networkId, "VPNSubscription"),
    VPN_SUBSCRIPTION_ABI,
    provider
  ) as ethers.Contract & VPNSubscriptionContract;

  const registryContract = new ethers.Contract(
    getContractAddress(networkId, "VPNRegistry"),
    VPN_REGISTRY_ABI,
    provider
  ) as ethers.Contract & VPNRegistryContract;

  return {
    subscriptionContract,
    registryContract
  };
}; 