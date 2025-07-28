import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ethers, Contract, Interface, InterfaceAbi } from 'ethers';
import Web3Modal from 'web3modal';
import { VPNRegistry } from '../contracts/typechain/VPNRegistry';
import { VPNSubscription } from '../contracts/typechain/VPNSubscription';
import { getContractAddress } from '../config/contracts';
import { LoadingScreen } from '../components/LoadingScreen';
import { useNavigate } from 'react-router-dom';
import type { Ethereum } from '../types';

// Import ABIs
import VPNRegistryJSON from '../contracts/VPNRegistry.json';
import VPNSubscriptionJSON from '../contracts/VPNSubscription.json';

// Create Interface instances from ABIs
const registryInterface = new Interface(VPNRegistryJSON.abi as InterfaceAbi);
const subscriptionInterface = new Interface(VPNSubscriptionJSON as InterfaceAbi);

// Get environment variables with fallbacks
const NETWORK_ID = process.env.REACT_APP_NETWORK_ID || '11155111';
const NETWORK_NAME = process.env.REACT_APP_NETWORK_NAME?.toLowerCase() || 'sepolia';
const ENABLE_TESTNET = process.env.REACT_APP_ENABLE_TESTNET === 'true';
const ALCHEMY_API_KEY = process.env.REACT_APP_ALCHEMY_API_KEY;

console.log('Environment Configuration:', {
  networkId: NETWORK_ID,
  networkName: NETWORK_NAME,
  enableTestnet: ENABLE_TESTNET,
  alchemyKeyExists: !!ALCHEMY_API_KEY // Don't log the actual key
});

// Verify Alchemy API key
if (!ALCHEMY_API_KEY) {
  console.error('Alchemy API key is not configured. Please check your .env file.');
}

const CHAIN_ID = parseInt(NETWORK_ID);
const HEX_CHAIN_ID = `0x${CHAIN_ID.toString(16)}`;

// Supported Networks Configuration with proper RPC URLs
const SUPPORTED_NETWORKS = {
  SEPOLIA: {
    chainId: HEX_CHAIN_ID,
    chainName: 'Sepolia',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18
    },
    rpcUrls: [`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  }
};

// Define custom type for Web3Modal instance
interface IWeb3ModalOptions {
  cacheProvider?: boolean;
  theme?: string;
  disableInjectedProvider?: boolean;
}

type CustomWeb3Modal = Web3Modal & {
  cachedProvider: string;
  clearCachedProvider(): void;
};

const web3Modal = new Web3Modal({
  cacheProvider: true,
  theme: "dark",
  providerOptions: {
    injected: {
      display: {
        name: 'MetaMask',
        description: 'Connect with MetaMask',
      },
      package: null
    }
  }
}) as CustomWeb3Modal;

interface Web3ContextType {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  contract: VPNRegistry | null;
  subscriptionContract: VPNSubscription | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
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
  signer: null,
  contract: null,
  subscriptionContract: null,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
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

// Add debounce utility
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [jsonRpcProvider, setJsonRpcProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<VPNRegistry | null>(null);
  const [subscriptionContract, setSubscriptionContract] = useState<VPNSubscription | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectedNode, setConnectedNode] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState(0);
  const CONNECTION_COOLDOWN = 2000; // 2 seconds cooldown between attempts
  const navigate = useNavigate();

  // Initialize JsonRpcProvider
  useEffect(() => {
    if (!ALCHEMY_API_KEY) {
      console.error('Cannot initialize provider: Alchemy API key is missing');
      return;
    }
    const rpcUrl = `https://eth-${NETWORK_NAME}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    setJsonRpcProvider(provider);
  }, [ALCHEMY_API_KEY]);

  // Setup provider and contracts
  const setupProviderAndContracts = async (web3Provider: ethers.BrowserProvider) => {
    try {
      setProvider(web3Provider);
      const web3Signer = await web3Provider.getSigner();
      setSigner(web3Signer);

      if (!jsonRpcProvider) {
        throw new Error('JsonRpcProvider not initialized');
      }

      // Get contract addresses
      const registryAddress = getContractAddress(NETWORK_ID, 'VPNRegistry');
      const subscriptionAddress = getContractAddress(NETWORK_ID, 'VPNSubscription');

      if (!registryAddress || !subscriptionAddress) {
        throw new Error('Contract addresses not found');
      }

      // Initialize contracts with JsonRpcProvider for read operations
      const registryContract = new Contract(
        registryAddress,
        registryInterface,
        jsonRpcProvider
      ) as unknown as VPNRegistry;

      const subscriptionContract = new Contract(
        subscriptionAddress,
        subscriptionInterface,
        jsonRpcProvider
      ) as unknown as VPNSubscription;

      // Connect contracts to signer for write operations
      const registryWithSigner = registryContract.connect(web3Signer);
      const subscriptionWithSigner = subscriptionContract.connect(web3Signer);

      setContract(registryWithSigner);
      setSubscriptionContract(subscriptionWithSigner);

      // Check admin status
      const address = await web3Signer.getAddress();
      const isRegularAdmin = await registryContract.admins(address);
      const superAdmin = await registryContract.admin();
      
      setIsAdmin(isRegularAdmin);
      setIsSuperAdmin(superAdmin.toLowerCase() === address.toLowerCase());
      setIsInitialized(true);
    } catch (error: any) {
      console.error('Setup error:', error);
      setError(error.message || 'Failed to setup provider and contracts');
      throw error;
    }
  };

  // Add network switching function
  const switchToNetwork = async (provider: any) => {
    try {
      // First try to switch to the network
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: HEX_CHAIN_ID }]
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain ID')) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [SUPPORTED_NETWORKS.SEPOLIA]
          });
        } catch (error: any) {
          console.error('Error adding network:', error);
          throw new Error(`Failed to add network: ${error.message}`);
        }
      } else {
        console.error('Error switching network:', switchError);
        throw new Error(`Failed to switch network: ${switchError.message}`);
      }
    }
  };

  // Reset connection state
  const resetConnection = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    setSubscriptionContract(null);
    setIsConnected(false);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsInitialized(false);
    setIsConnecting(false);
    web3Modal.clearCachedProvider();
  }, []);

  const connectWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to use this application');
      }

      const ethereum = window.ethereum;

      // Request accounts
      console.log('Requesting accounts...');
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask and try again.');
      }

      const account = accounts[0];
      setAccount(account);

      // Create Web3Provider using MetaMask's provider
      const web3Provider = new ethers.BrowserProvider(ethereum);

      // Switch to the correct network first
      await switchToNetwork(ethereum);

      // Setup provider and contracts
      await setupProviderAndContracts(web3Provider);
      setIsConnected(true);

      // Setup event listeners
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

    } catch (error: any) {
      console.error('Connection error:', error);
      setError(error.message || 'Failed to connect wallet');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-connect effect
  useEffect(() => {
    const autoConnect = async () => {
      if (web3Modal.cachedProvider) {
        try {
          await connectWallet();
        } catch (error) {
          console.error('Auto-connect error:', error);
          // Clear cached provider if auto-connect fails
          web3Modal.clearCachedProvider();
        }
      }
    };

    autoConnect();
  }, []);

  // Event handlers
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      disconnectWallet();
    } else {
      // User switched accounts
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    // Reload the page when the chain changes
    window.location.reload();
  };

  const disconnectWallet = async () => {
    try {
      setIsLoading(true);
      resetConnection();
      navigate('/');
    } catch (error: any) {
      console.error('Disconnect error:', error);
      setError(error.message || 'Failed to disconnect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  // Admin management functions
  const addAdmin = async (address: string) => {
    if (!contract) throw new Error('Contract not initialized');
    await contract.addAdmin(address);
  };

  const removeAdmin = async (address: string) => {
    if (!contract) throw new Error('Contract not initialized');
    await contract.removeAdmin(address);
  };

  const getAdmins = async (): Promise<string[]> => {
    if (!contract) return [];
    try {
      // Get all admin added events
      const filter = contract.filters.AdminAdded();
      const events = await contract.queryFilter(filter);
      const adminAddresses = events.map(event => event.args?.[0] as string);
      
      // Filter out removed admins
      const removedFilter = contract.filters.AdminRemoved();
      const removedEvents = await contract.queryFilter(removedFilter);
      const removedAddresses = new Set(removedEvents.map(event => event.args?.[0] as string));

      return adminAddresses.filter(address => !removedAddresses.has(address));
    } catch (error) {
      console.error('Error getting admins:', error);
      return [];
    }
  };

  // Add clearAllMetaMaskData function if not already present
  const clearAllMetaMaskData = () => {
    // Clear Web3 connection caches
    localStorage.removeItem('walletconnect');
    localStorage.removeItem('WEB3_CONNECT_CACHED_PROVIDER');
    localStorage.removeItem('web3modal_cached_provider');
    localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
    
    // Clear any VPN related data
    localStorage.removeItem('recent_connections');
    localStorage.removeItem('favorite_nodes');
    localStorage.removeItem('performance_history');
    localStorage.removeItem('user_preferences');
    
    // Clear any other potential MetaMask related items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('metamask') || key?.includes('web3') || key?.includes('wallet')) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear session storage as well
    sessionStorage.clear();
  };

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        contract,
        subscriptionContract,
        connectWallet,
        disconnectWallet,
        isConnected,
        error,
        setError,
        isLoading,
        connectedNode,
        setConnectedNode,
        isAdmin,
        isSuperAdmin,
        addAdmin,
        removeAdmin,
        getAdmins,
        isInitialized
      }}
    >
      {children}
      {isLoading && <LoadingScreen />}
    </Web3Context.Provider>
  );
};

export { Web3Context };
export const useWeb3 = () => useContext(Web3Context);