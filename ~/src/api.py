from flask import Flask, jsonify, request, send_file, make_response
from flask_cors import CORS
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
import threading

app = Flask(__name__)

# Enhanced CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": ["*"],  # Allow all origins for development
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Disposition"],
        "supports_credentials": True,
        "max_age": 600  # Cache preflight requests for 10 minutes
    }
})

# Load server public key at startup
try:
    with open('/etc/wireguard/public.key', 'r') as f:
        SERVER_PUBLIC_KEY = f.read().strip()
except Exception as e:
    print(f"Failed to load server public key: {e}")
    SERVER_PUBLIC_KEY = None

@app.before_first_request
def setup():
    """Initialize necessary components before first request"""
    pass

@app.route('/generate-peer', methods=['POST', 'OPTIONS'])
def generate_peer():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Expose-Headers', 'Content-Disposition')
        return response

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
        if not verify_subscription(eth_address):
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

        # Return configuration file with proper headers
        response = send_file(
            config_path,
            mimetype='application/x-wireguard-config',
            as_attachment=True,
            download_name=f'wg0-client-{eth_address[:8]}.conf'
        )
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Expose-Headers', 'Content-Disposition')
        return response

    except Exception as e:
        error_response = jsonify({'error': str(e)})
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        return error_response, 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    response = jsonify({'status': 'healthy', 'message': 'VPN node is running'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

def run_app_on_port(port):
    """Run the Flask app on a specific port"""
    try:
        app.run(host='0.0.0.0', port=port, debug=False)
    except Exception as e:
        print(f"Failed to start server on port {port}: {e}")

if __name__ == '__main__':
    # Start server on port 80 in a separate thread
    port_80_thread = threading.Thread(target=run_app_on_port, args=(80,))
    port_80_thread.start()

    # Run the main server on port 5000
    run_app_on_port(5000) 