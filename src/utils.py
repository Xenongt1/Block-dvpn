import os
import subprocess
import requests
from pathlib import Path
import json
from web3 import Web3
from eth_account import Account
import secrets

# Constants
WG_CONFIG_DIR = '/etc/wireguard'
PEERS_DIR = os.path.join(WG_CONFIG_DIR, 'peers')
NETWORK_RANGE = '10.8.0.0/24'  # WireGuard network range
SUBSCRIPTION_CONTRACT_ADDRESS = '0x103F744c4d064223AA0c6986d2465396F4F3e394'  # Your contract address

def get_public_ip():
    """Get the server's public IP address"""
    try:
        response = requests.get('https://api.ipify.org?format=json')
        return response.json()['ip']
    except Exception as e:
        print(f"Error getting public IP: {e}")
        return None

def generate_wireguard_keys():
    """Generate a new WireGuard key pair"""
    try:
        # Generate private key
        private_key = subprocess.check_output(['wg', 'genkey']).decode('utf-8').strip()
        
        # Generate public key from private key
        public_key = subprocess.run(['wg', 'pubkey'], 
                                  input=private_key.encode(), 
                                  capture_output=True, 
                                  text=True).stdout.strip()
        
        return private_key, public_key
    except Exception as e:
        print(f"Error generating WireGuard keys: {e}")
        return None, None

def get_next_available_ip():
    """Get the next available IP address for a new peer"""
    try:
        # Create peers directory if it doesn't exist
        os.makedirs(PEERS_DIR, exist_ok=True)
        
        # List existing peer configs
        existing_ips = set()
        for peer_file in os.listdir(PEERS_DIR):
            if peer_file.endswith('.conf'):
                with open(os.path.join(PEERS_DIR, peer_file), 'r') as f:
                    content = f.read()
                    # Extract IP from config
                    for line in content.split('\n'):
                        if 'Address' in line:
                            ip = line.split('=')[1].strip().split('/')[0]
                            existing_ips.add(ip)
        
        # Generate next available IP
        base_ip = NETWORK_RANGE.split('/')[0]  # e.g., '10.8.0.0'
        base_parts = [int(x) for x in base_ip.split('.')]
        
        # Start from .2 (as .1 is typically the server)
        for i in range(2, 255):
            candidate_ip = f"{base_parts[0]}.{base_parts[1]}.{base_parts[2]}.{i}"
            if candidate_ip not in existing_ips:
                return candidate_ip
                
        raise Exception("No available IP addresses")
    except Exception as e:
        print(f"Error getting next available IP: {e}")
        return None

def verify_subscription(eth_address):
    """Verify if the user has an active subscription"""
    try:
        # Initialize Web3 with your Ethereum node
        w3 = Web3(Web3.HTTPProvider('https://eth-mainnet.g.alchemy.com/v2/your-api-key'))
        
        # Load the contract ABI (you'll need to provide this)
        with open('subscription_abi.json', 'r') as f:
            contract_abi = json.load(f)
        
        # Create contract instance
        contract = w3.eth.contract(
            address=SUBSCRIPTION_CONTRACT_ADDRESS,
            abi=contract_abi
        )
        
        # Check subscription status
        has_subscription = contract.functions.hasActiveSubscription(eth_address).call()
        return has_subscription
    except Exception as e:
        print(f"Error verifying subscription: {e}")
        # For testing, return True. In production, handle this properly
        return True

def create_peer_config(private_key, public_key, peer_ip, server_public_key, server_ip):
    """Create WireGuard configuration for a peer"""
    return f"""[Interface]
PrivateKey = {private_key}
Address = {peer_ip}/24
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = {server_public_key}
AllowedIPs = 0.0.0.0/0
Endpoint = {server_ip}:51820
PersistentKeepalive = 25
"""

def save_peer_config(config, eth_address):
    """Save peer configuration to a file"""
    try:
        # Create peers directory if it doesn't exist
        os.makedirs(PEERS_DIR, exist_ok=True)
        
        # Create config file
        config_path = os.path.join(PEERS_DIR, f"{eth_address}.conf")
        with open(config_path, 'w') as f:
            f.write(config)
        
        return config_path
    except Exception as e:
        print(f"Error saving peer config: {e}")
        return None

def run_command(cmd):
    """Run a shell command and return output and error"""
    try:
        process = subprocess.Popen(
            cmd.split(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        output, error = process.communicate()
        return output.decode('utf-8'), error.decode('utf-8')
    except Exception as e:
        print(f"Error running command: {e}")
        return None, str(e) 