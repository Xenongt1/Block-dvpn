# WireGuard VPN Node Test Project

This project contains scripts to set up and test a WireGuard VPN server on Google Cloud Platform, with dynamic peer configuration generation.

## Google Cloud VM Setup

1. Create a new VM instance in Google Cloud Console:
   ```bash
   # Create a new VM with these specifications:
   - Machine type: e2-micro (2 vCPU, 1 GB memory)
   - Region: Choose one close to you
   - Boot disk: Ubuntu 20.04 LTS
   - Allow HTTP and HTTPS traffic
   ```

2. Add a firewall rule for WireGuard:
   - Go to VPC Network → Firewall
   - Create a new rule:
     - Name: allow-wireguard
     - Target tags: vpn-node
     - Source IP ranges: 0.0.0.0/0
     - UDP port: 51820

3. Add the network tag 'vpn-node' to your VM instance

4. SSH into your VM and clone this repository:
   ```bash
   git clone <your-repo-url>
   cd wireguard-test
   ```

## Installation

1. Run the setup script:
   ```bash
   sudo chmod +x setup.sh
   sudo ./setup.sh
   ```

   This will:
   - Install WireGuard
   - Configure system for IP forwarding
   - Set up initial WireGuard configuration
   - Start the WireGuard service

## Adding New Peers

1. To generate a new peer configuration:
   ```bash
   sudo python3 generate_peer.py
   ```

   This will:
   - Generate new peer keys
   - Add the peer to the server configuration
   - Create a client configuration file in the output/ directory

2. The generated configuration file will be in `output/peer_X.conf` where X is the peer number

## Testing the Connection

1. Copy the generated peer configuration from the output/ directory to your local machine

2. Install WireGuard on your local machine:
   - Windows: https://www.wireguard.com/install/
   - macOS: `brew install wireguard-tools`
   - Linux: `sudo apt install wireguard`

3. Import the configuration:
   - Windows: Import the .conf file in the WireGuard GUI
   - macOS/Linux: Copy the .conf file to `/etc/wireguard/` and use `wg-quick up <interface>`

4. Test the connection:
   ```bash
   ping 10.0.0.1  # Should reach the VPN server
   curl ifconfig.me  # Should show the VPN server's IP
   ```

## Troubleshooting

1. Check WireGuard status:
   ```bash
   sudo wg show
   sudo systemctl status wg-quick@wg0
   ```

2. Check logs:
   ```bash
   sudo journalctl -xeu wg-quick@wg0
   ```

3. Verify firewall rules:
   ```bash
   sudo iptables -L -n -v
   ```

## Security Notes

- Keep your private keys secure and never share them
- Each peer configuration is unique and should only be used on one device
- The server's private key is in `/etc/wireguard/private.key`
- Client configurations are stored in the output/ directory 