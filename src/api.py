from flask import Flask, jsonify, request, send_file
import os
from pathlib import Path
from utils import (
    get_public_ip,
    generate_wireguard_keys,
    get_next_available_ip,
    verify_subscription,
    save_peer_config,
    create_peer_config,
    run_command
)

app = Flask(__name__)

# Configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')

# Load server public key at startup
try:
    with open('/etc/wireguard/public.key', 'r') as f:
        SERVER_PUBLIC_KEY = f.read().strip()
except Exception as e:
    print(f"Failed to load server public key: {e}")
    SERVER_PUBLIC_KEY = None

@app.route('/generate-peer', methods=['POST'])
def generate_peer():
    try:
        # Check if we have the server public key
        if not SERVER_PUBLIC_KEY:
            return jsonify({'error': 'Server public key not loaded'}), 500

        # Validate request
        data = request.get_json()
        if not data or 'eth_address' not in data:
            return jsonify({'error': 'eth_address is required'}), 400

        eth_address = data['eth_address']

        # Verify subscription
        if not verify_subscription(eth_address, BACKEND_URL):
            return jsonify({'error': 'Invalid or expired subscription'}), 401

        # Generate peer keys
        private_key, public_key = generate_wireguard_keys()
        if not private_key or not public_key:
            return jsonify({'error': 'Failed to generate keys'}), 500

        # Get next available IP
        peer_ip = get_next_available_ip()

        # Get server public IP
        server_ip = get_public_ip()
        if not server_ip:
            return jsonify({'error': 'Failed to get server IP'}), 500

        # Create peer configuration
        config = create_peer_config(
            private_key,
            public_key,
            peer_ip,
            SERVER_PUBLIC_KEY,
            server_ip
        )

        # Save peer configuration
        config_path = save_peer_config(config, eth_address)

        # Add peer to WireGuard
        cmd = f"wg set wg0 peer {public_key} allowed-ips {peer_ip}/32"
        output, error = run_command(cmd)
        if error:
            return jsonify({'error': f'Failed to add peer: {error}'}), 500

        # Return configuration file
        return send_file(
            config_path,
            mimetype='application/x-wireguard-config',
            as_attachment=True,
            download_name='wg0-client.conf'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 