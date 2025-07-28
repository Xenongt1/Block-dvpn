#!/bin/bash

# Create WireGuard keys if they don't exist
if [ ! -f "/etc/wireguard/private.key" ]; then
    wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key
fi

# Read the keys
PRIVATE_KEY=$(cat /etc/wireguard/private.key)
PUBLIC_KEY=$(cat /etc/wireguard/public.key)

# Create WireGuard configuration
cat > /etc/wireguard/wg0.conf << EOF
[Interface]
PrivateKey = ${PRIVATE_KEY}
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Peers will be added dynamically
EOF

# Enable and start WireGuard
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

# Create peers.json if it doesn't exist
if [ ! -f "/etc/wireguard/peers.json" ]; then
    echo "{}" > /etc/wireguard/peers.json
fi

# Set proper permissions
chown -R root:root /etc/wireguard
chmod -R 600 /etc/wireguard/*

echo "WireGuard setup complete!"
echo "Server Public Key: ${PUBLIC_KEY}" 