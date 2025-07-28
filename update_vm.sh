#!/bin/bash

# Create web3_utils.py
ssh root@35.246.119.40 "cat > /root/vpn-node/src/web3_utils.py" << 'EOL'
from web3 import Web3
import os

# Connect to Sepolia via Alchemy
ALCHEMY_URL = os.getenv('ALCHEMY_URL', 'https://eth-sepolia.g.alchemy.com/v2/tD_Fd_29bTD-uDOETIcu2')
w3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))

# Contract addresses
VPN_SUBSCRIPTION_ADDRESS = '0x516Fa3Ea215c372696e6D291F00f251f49904439'
VPN_REGISTRY_ADDRESS = '0x103F744c4d064223AA0c6986d2465396F4F3e394'

# Minimal ABI for subscription check
SUBSCRIPTION_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "hasActiveSubscription",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
]

def check_subscription(eth_address: str) -> bool:
    """Check if an address has an active subscription"""
    try:
        # Ensure the address is checksum
        eth_address = Web3.to_checksum_address(eth_address)
        contract = w3.eth.contract(
            address=VPN_SUBSCRIPTION_ADDRESS,
            abi=SUBSCRIPTION_ABI
        )
        return contract.functions.hasActiveSubscription(eth_address).call()
    except Exception as e:
        print(f"Error checking subscription: {e}")
        return False
EOL

# Update requirements.txt
ssh root@35.246.119.40 "cat > /root/vpn-node/requirements.txt" << 'EOL'
flask==3.0.2
requests==2.31.0
python-dotenv==1.0.1
web3==6.15.1
EOL

# Install new requirements and restart service
ssh root@35.246.119.40 "cd /root/vpn-node && pip install -r requirements.txt && systemctl restart vpn-api" 