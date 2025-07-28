#!/bin/bash

WG_CONFIG="/etc/wireguard/wg0.conf"
WG_CLIENTS_DIR="/etc/wireguard/clients"

# Ensure directories exist
mkdir -p "$WG_CLIENTS_DIR"

# Function to add a new client
add_client() {
    local CLIENT_PUBKEY="$1"
    local CLIENT_IP="$2"
    local CLIENT_NAME="$3"

    # Create client config file
    cat > "$WG_CLIENTS_DIR/$CLIENT_NAME.conf" << EOF
[Peer]
PublicKey = $CLIENT_PUBKEY
AllowedIPs = $CLIENT_IP/32
EOF

    # Add client to main config
    wg set wg0 peer "$CLIENT_PUBKEY" allowed-ips "$CLIENT_IP/32"
    
    # Save the configuration
    wg-quick save wg0
    
    echo "Client $CLIENT_NAME added successfully"
}

# Function to remove a client
remove_client() {
    local CLIENT_PUBKEY="$1"
    local CLIENT_NAME="$2"

    # Remove from WireGuard
    wg set wg0 peer "$CLIENT_PUBKEY" remove
    
    # Remove client config file
    rm -f "$WG_CLIENTS_DIR/$CLIENT_NAME.conf"
    
    # Save the configuration
    wg-quick save wg0
    
    echo "Client $CLIENT_NAME removed successfully"
}

# Function to list all clients
list_clients() {
    echo "Current WireGuard Peers:"
    wg show wg0 dump | tail -n +2 | while read -r line; do
        pubkey=$(echo "$line" | cut -f1)
        allowed_ips=$(echo "$line" | cut -f4)
        last_handshake=$(echo "$line" | cut -f5)
        echo "PublicKey: $pubkey"
        echo "AllowedIPs: $allowed_ips"
        echo "Last Handshake: $last_handshake"
        echo "---"
    done
}

# Main command handler
case "$1" in
    "add")
        if [ "$#" -ne 4 ]; then
            echo "Usage: $0 add <client_pubkey> <client_ip> <client_name>"
            exit 1
        fi
        add_client "$2" "$3" "$4"
        ;;
    "remove")
        if [ "$#" -ne 3 ]; then
            echo "Usage: $0 remove <client_pubkey> <client_name>"
            exit 1
        fi
        remove_client "$2" "$3"
        ;;
    "list")
        list_clients
        ;;
    *)
        echo "Usage: $0 {add|remove|list}"
        echo "add <client_pubkey> <client_ip> <client_name>"
        echo "remove <client_pubkey> <client_name>"
        echo "list"
        exit 1
        ;;
esac 