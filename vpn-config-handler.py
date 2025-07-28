import json
import os
import requests
from pathlib import Path

class VPNConfigHandler:
    def __init__(self):
        self.config_dir = Path(os.path.expanduser("~")) / ".vpn-configs"
        self.config_dir.mkdir(exist_ok=True)
        
    def save_peer_config(self, peer_json):
        """Save peer configuration received as JSON"""
        try:
            # Validate JSON structure
            peer_data = json.loads(peer_json) if isinstance(peer_json, str) else peer_json
            
            # Save the peer config
            config_file = self.config_dir / f"{peer_data['peer_id']}.json"
            with open(config_file, 'w') as f:
                json.dump(peer_data, f, indent=2)
                
            return str(config_file)
        except Exception as e:
            print(f"Error saving peer config: {e}")
            return None

    def download_vpn_config(self, config_url, config_name):
        """Download VPN configuration file from URL"""
        try:
            response = requests.get(config_url)
            response.raise_for_status()
            
            config_file = self.config_dir / f"{config_name}.conf"
            with open(config_file, 'wb') as f:
                f.write(response.content)
                
            return str(config_file)
        except Exception as e:
            print(f"Error downloading config: {e}")
            return None

def main():
    # Example usage
    handler = VPNConfigHandler()
    
    # Example peer config
    peer_config = {
        "peer_id": "example_peer",
        "public_key": "example_key",
        "allowed_ips": "10.0.0.2/32"
    }
    
    # Save peer config
    saved_path = handler.save_peer_config(peer_config)
    if saved_path:
        print(f"Peer config saved to: {saved_path}")
    
    # Example config download
    # config_path = handler.download_vpn_config("https://example.com/vpn-config", "my-vpn-config")
    # if config_path:
    #     print(f"VPN config downloaded to: {config_path}")

if __name__ == "__main__":
    main() 