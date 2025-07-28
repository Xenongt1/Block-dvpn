#!/usr/bin/env python3

import os
import sys
import subprocess
import json
import argparse
from pathlib import Path
import random

def run_command(command):
    """Run a shell command and return its output"""
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(f"Error output: {e.stderr}")
        sys.exit(1)

def get_server_info():
    """Get server's public key and public IP"""
    public_key = run_command("cat /etc/wireguard/public.key")
    public_ip = run_command("curl -s ifconfig.me")
    return public_key, public_ip

def generate_peer_keys():
    """Generate private and public keys for a peer"""
    private_key = run_command("wg genkey")
    public_key = run_command(f"echo '{private_key}' | wg pubkey")
    return private_key, public_key

def get_next_peer_ip():
    """Get the next available peer IP"""
    # Get list of existing peers
    wg_show = run_command("wg show wg0 dump")
    used_ips = set()
    
    # Skip first line (server info)
    for line in wg_show.split('\n')[1:]:
        if line:
            parts = line.split('\t')
            if len(parts) >= 4:
                peer_ip = parts[3].split('/')[0]  # Extract IP without subnet
                last_octet = int(peer_ip.split('.')[-1])
                used_ips.add(last_octet)
    
    # Find next available IP in range 2-254
    for i in range(2, 255):
        if i not in used_ips:
            return f"10.0.0.{i}"
    
    raise Exception("No available IP addresses")

def create_peer_config(peer_private_key, server_public_key, server_public_ip, peer_ip):
    """Create peer configuration"""
    return f"""[Interface]
PrivateKey = {peer_private_key}
Address = {peer_ip}/32
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = {server_public_key}
AllowedIPs = 0.0.0.0/0
Endpoint = {server_public_ip}:51820
PersistentKeepalive = 25"""

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Generate WireGuard peer configuration')
    parser.add_argument('--user', help='User address or identifier', required=False)
    args = parser.parse_args()

    # Check if running as root
    if os.geteuid() != 0:
        print("This script must be run as root")
        sys.exit(1)

    print("Generating new peer configuration...")
    
    # Get server information
    server_public_key, server_public_ip = get_server_info()
    
    # Generate peer keys
    peer_private_key, peer_public_key = generate_peer_keys()
    
    # Get next available IP
    peer_ip = get_next_peer_ip()
    
    # Create output directory if it doesn't exist
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    
    # Use user address as identifier if provided
    if args.user:
        config_name = f"peer_{args.user}.conf"
    else:
        # Find next available peer number for backward compatibility
        peer_num = 1
        while (output_dir / f"peer_{peer_num}.conf").exists():
            peer_num += 1
        config_name = f"peer_{peer_num}.conf"
    
    # Create peer configuration
    peer_config = create_peer_config(peer_private_key, server_public_key, server_public_ip, peer_ip)
    
    # Save peer configuration
    config_path = output_dir / config_name
    with open(config_path, "w") as f:
        f.write(peer_config)
    
    # Add peer to WireGuard server
    add_peer_cmd = f"wg set wg0 peer {peer_public_key} allowed-ips {peer_ip}/32"
    run_command(add_peer_cmd)
    
    print(f"\nPeer configuration generated successfully!")
    print(f"Configuration saved to: {config_path}")
    print(f"Peer IP: {peer_ip}")
    print(f"Peer Public Key: {peer_public_key}")
    print("\nImport the configuration file into your WireGuard client to connect.")

if __name__ == "__main__":
    main() 