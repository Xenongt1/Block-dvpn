import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, JsonRpcSigner, Contract, Interface, InterfaceAbi } from 'ethers';
import Web3Modal from 'web3modal';
import { VPNRegistry } from '../contracts/typechain/VPNRegistry';
import { VPNSubscription } from '../contracts/typechain/VPNSubscription';
import { getContractAddress } from '../config/contracts';
import { LoadingScreen } from '../components/LoadingScreen';
import { useNavigate } from 'react-router-dom';

// Import ABIs
import VPNRegistryABI from '../contracts/VPNRegistry.json';
import VPNSubscriptionABI from '../contracts/VPNSubscription.json';

// Create Interface instances from ABIs
const registryInterface = new Interface(VPNRegistryABI.abi as InterfaceAbi);
const subscriptionInterface = new Interface(VPNSubscriptionABI as InterfaceAbi);

// Supported Networks
const SUPPORTED_NETWORKS = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrls: ['https://sepolia.infura.io/v3/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18
    }
  },
  MAINNET: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    blockExplorerUrls: ['https://etherscan.io'],
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  }
};

interface Web3ContextType {
  account: string | null;
  provider: BrowserProvider | null;
  contract: VPNRegistry | null;
  subscriptionContract: VPNSubscription | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnected: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  isLoading: boolean;
  connectedNode: string | null;
  setConnectedNode: (nodeAddress: string | null) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  addAdmin: (address: string) => Promise<void>;
  removeAdmin: (address: string) => Promise<void>;
  getAdmins: () => Promise<string[]>;
  isInitialized: boolean;
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  provider: null,
  contract: null,
  subscriptionContract: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  isConnected: false,
  error: null,
  setError: () => {},
  isLoading: false,
  connectedNode: null,
  setConnectedNode: () => {},
  isAdmin: false,
  isSuperAdmin: false,
  addAdmin: async () => {},
  removeAdmin: async () => {},
  getAdmins: async () => [],
  isInitialized: false,
});

// Export both the context and the hook
export { Web3Context };
export const useWeb3 = () => useContext(Web3Context);

// Development mode flag - Set to false for production
const isDevelopment = false;

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<VPNRegistry | null>(null);
  const [subscriptionContract, setSubscriptionContract] = useState<VPNSubscription | null>(null);
  const [web3Modal, setWeb3Modal] = useState<Web3Modal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [connectedNode, setConnectedNode] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        contract,
        subscriptionContract,
        connectWallet: async () => {},
        disconnectWallet: () => {},
        isConnected: !!account,
        error,
        setError,
        isLoading,
        connectedNode,
        setConnectedNode,
        isAdmin,
        isSuperAdmin,
        addAdmin: async () => {},
        removeAdmin: async () => {},
        getAdmins: async () => [],
        isInitialized,
      }}
    >
      {isInitializing ? <LoadingScreen /> : children}
    </Web3Context.Provider>
  );
}; 