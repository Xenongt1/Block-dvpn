from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from functools import wraps
import jwt
import os
from dotenv import load_dotenv
from services.vpn_service import VPNService
from services.auth_service import AuthService
from services.ethereum_service import EthereumService

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize services
vpn_service = VPNService()
auth_service = AuthService()
eth_service = EthereumService()

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401

        try:
            # Verify JWT token
            data = auth_service.verify_token(token)
            # Store user data for the route handler
            request.user = data
        except:
            return jsonify({'error': 'Invalid authentication token'}), 401

        return f(*args, **kwargs)
    return decorated

@app.route('/api/vpn/generate-peer', methods=['POST'])
@require_auth
def generate_peer():
    try:
        user_address = request.user['address']
        node_ip = request.json.get('nodeIP')

        if not node_ip:
            return jsonify({'error': 'Node IP is required'}), 400

        # Verify subscription status using Ethereum service
        if not eth_service.verify_subscription(user_address):
            return jsonify({'error': 'No active subscription found'}), 403

        # Generate peer configuration
        config_path = vpn_service.generate_peer(node_ip, user_address)
        
        # Send configuration file
        return send_file(
            config_path,
            mimetype='application/x-wireguard-config',
            as_attachment=True,
            download_name='wg0-client.conf'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vpn/status', methods=['GET'])
@require_auth
def get_vpn_status():
    try:
        user_address = request.user['address']
        node_ip = request.args.get('nodeIP')

        if not node_ip:
            return jsonify({'error': 'Node IP is required'}), 400

        status = vpn_service.get_peer_status(node_ip, user_address)
        return jsonify(status)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 