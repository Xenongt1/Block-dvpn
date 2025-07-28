import os
import requests
from typing import Optional, Dict, Any

class VPNService:
    def __init__(self):
        self.vpn_api_url = os.getenv('VPN_NODE_API_URL', 'https://35.246.119.40:5000')
        self.api_key = os.getenv('VPN_NODE_API_KEY', 'your-secure-api-key')
        self.headers = {'X-API-Key': self.api_key}
        self.verify_ssl = False  # For development. In production, use proper SSL certificates

    def generate_peer_config(self, user_address: str) -> Dict[str, Any]:
        """Generate a new WireGuard peer configuration for a user."""
        try:
            response = requests.post(
                f"{self.vpn_api_url}/generate-peer",
                json={'user_address': user_address},
                headers=self.headers,
                verify=self.verify_ssl
            )
            response.raise_for_status()
            return {
                'success': True,
                'config': response.content,
                'filename': 'wg0-client.conf'
            }
        except requests.RequestException as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_peer_status(self, user_address: str) -> Dict[str, Any]:
        """Get the connection status of a peer."""
        try:
            response = requests.get(
                f"{self.vpn_api_url}/peer-status",
                params={'user_address': user_address},
                headers=self.headers,
                verify=self.verify_ssl
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            return {
                'status': 'error',
                'error': str(e)
            } 