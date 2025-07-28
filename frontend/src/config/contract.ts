import { ethers, Provider } from 'ethers';

// Your contract ABI - this is just an example, replace with your actual ABI
export const DVPN_ABI = [
    // Subscription checking
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "checkSubscription",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    // Node registration
    {
        "inputs": [
            {"internalType": "string", "name": "nodeUrl", "type": "string"},
            {"internalType": "uint256", "name": "bandwidth", "type": "uint256"},
            {"internalType": "uint256", "name": "price", "type": "uint256"}
        ],
        "name": "registerNode",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // Get node details
    {
        "inputs": [{"internalType": "address", "name": "nodeAddress", "type": "address"}],
        "name": "getNodeDetails",
        "outputs": [
            {
                "components": [
                    {"internalType": "string", "name": "url", "type": "string"},
                    {"internalType": "uint256", "name": "bandwidth", "type": "uint256"},
                    {"internalType": "uint256", "name": "price", "type": "uint256"},
                    {"internalType": "bool", "name": "active", "type": "bool"}
                ],
                "internalType": "struct DVPN.NodeInfo",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    // Subscribe to service
    {
        "inputs": [{"internalType": "uint256", "name": "duration", "type": "uint256"}],
        "name": "subscribe",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
] as const;

// Contract addresses for different networks
export const CONTRACT_ADDRESSES: Record<string, string> = {
    mainnet: '0x...', // Your mainnet contract address
    testnet: '0x...', // Your testnet contract address
    localhost: '0x...' // Your local development contract address
};

// Helper function to get contract instance
export const getDVPNContract = (provider: Provider, network: string = 'mainnet') => {
    const address = CONTRACT_ADDRESSES[network];
    if (!address) {
        throw new Error(`No contract address found for network: ${network}`);
    }
    return new ethers.Contract(address, DVPN_ABI, provider);
};

// Example usage in your VPN service
export const checkUserSubscription = async (
    userAddress: string,
    provider: Provider
): Promise<boolean> => {
    try {
        const contract = getDVPNContract(provider);
        return await contract.checkSubscription(userAddress);
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}; 