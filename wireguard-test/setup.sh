#!/bin/bash

# Exit on any error
set -e

echo "Starting WireGuard setup..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root"
    exit 1
fi

# Install WireGuard and required tools
echo "Installing WireGuard and dependencies..."
apt update
apt install -y wireguard wireguard-tools curl

# Enable IP forwarding
echo "Enabling IP forwarding..."
echo "net.ipv4.ip_forward=1" > /etc/sysctl.d/99-wireguard.conf
sysctl -p /etc/sysctl.d/99-wireguard.conf

# Create WireGuard directory if it doesn't exist
mkdir -p /etc/wireguard
chmod 700 /etc/wireguard

# Generate server keys
echo "Generating server keys..."
wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key
chmod 600 /etc/wireguard/private.key

# Get server private key
SERVER_PRIVATE_KEY=$(cat /etc/wireguard/private.key)

# Create initial WireGuard configuration
echo "Creating WireGuard configuration..."
cat > /etc/wireguard/wg0.conf << EOF
[Interface]
PrivateKey = ${SERVER_PRIVATE_KEY}
Address = 10.0.0.1/24
ListenPort = 51820
SaveConfig = true

# NAT & Forwarding
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
EOF

# Create output directory for peer configs
mkdir -p output
chmod 755 output

# Enable and start WireGuard
echo "Starting WireGuard service..."
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

echo "WireGuard setup complete!"
echo "Server public key: $(cat /etc/wireguard/public.key)"
echo "Server IP: $(curl -s ifconfig.me)"
echo "You can now use generate_peer.py to create new peer configurations." 