from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import subprocess
from pathlib import Path
import uuid
from typing import Dict
import json
import datetime

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WireGuard configuration
WG_CONFIG_DIR = Path("/etc/wireguard")
WG_INTERFACE = "wg0"
SERVER_PRIVATE_KEY_PATH = WG_CONFIG_DIR / "private.key"
SERVER_PUBLIC_KEY_PATH = WG_CONFIG_DIR / "public.key"
PEERS_FILE = WG_CONFIG_DIR / "peers.json"

class PeerRequest(BaseModel):
    user_id: str

def load_peers() -> Dict:
    if PEERS_FILE.exists():
        with open(PEERS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_peers(peers: Dict):
    with open(PEERS_FILE, 'w') as f:
        json.dump(peers, f)

def generate_keys():
    private_key = subprocess.check_output(["wg", "genkey"]).decode().strip()
    public_key = subprocess.run(["wg", "pubkey"], input=private_key.encode(), 
                              capture_output=True).stdout.decode().strip()
    return private_key, public_key

@app.post("/generate-peer")
async def generate_peer(request: PeerRequest):
    try:
        peers = load_peers()
        
        # Generate WireGuard keys for the new peer
        private_key, public_key = generate_keys()
        
        # Generate unique IP for the peer (assuming 10.0.0.0/24 network)
        used_ips = set(peer['ip'] for peer in peers.values())
        for i in range(2, 255):
            ip = f"10.0.0.{i}"
            if ip not in used_ips:
                peer_ip = ip
                break
        else:
            raise HTTPException(status_code=500, detail="No available IP addresses")

        # Create peer configuration
        peer_config = f"""[Interface]
PrivateKey = {private_key}
Address = {peer_ip}/24
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = {os.getenv('SERVER_PUBLIC_KEY')}
Endpoint = {os.getenv('SERVER_ENDPOINT')}:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
"""

        # Save peer information
        peer_id = str(uuid.uuid4())
        peers[request.user_id] = {
            "id": peer_id,
            "public_key": public_key,
            "ip": peer_ip,
            "created_at": str(datetime.datetime.now())
        }
        save_peers(peers)

        # Update WireGuard configuration
        subprocess.run(["wg", "set", WG_INTERFACE, "peer", public_key,
                       "allowed-ips", f"{peer_ip}/32"])

        return {
            "config": peer_config,
            "peer_id": peer_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 