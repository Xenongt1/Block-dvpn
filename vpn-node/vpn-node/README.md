# VPN Node Backend

This is the backend implementation for a decentralized VPN node that runs on a Google Cloud VM.

## Setup Instructions

### 1. Google Cloud VM Setup

1. Create a new VM instance:
   - Machine type: e2-medium (2 vCPU, 4GB RAM)
   - OS: Ubuntu 22.04 LTS
   - Allow HTTP/HTTPS traffic
   
2. Create firewall rules:
   ```bash
   # WireGuard UDP port
   gcloud compute firewall-rules create allow-wireguard --allow udp:51820
   # API port
   gcloud compute firewall-rules create allow-vpn-api --allow tcp:8000
   ```

### 2. System Setup

1. SSH into your VM and run:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install required packages
   sudo apt install -y wireguard python3-pip python3-venv ufw

   # Enable IP forwarding
   sudo echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
   sudo sysctl -p
   ```

### 3. Application Setup

1. Create application directory:
   ```bash
   sudo mkdir -p /opt/vpn-node
   sudo chown $USER:$USER /opt/vpn-node
   cd /opt/vpn-node
   ```

2. Copy all files to `/opt/vpn-node/`

3. Set up Python environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. Run WireGuard setup:
   ```bash
   sudo bash setup_wireguard.sh
   ```

5. Create .env file:
   ```bash
   cp .env.example .env
   # Edit .env with your server's public key and public IP
   ```

6. Set up systemd service:
   ```bash
   sudo cp vpn-api.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable vpn-api
   sudo systemctl start vpn-api
   ```

## API Endpoints

### Generate New Peer
- **URL**: `/generate-peer`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "user_id": "string"
  }
  ```
- **Response**: WireGuard configuration file

### Health Check
- **URL**: `/health`
- **Method**: `GET`
- **Response**: Status message

## Frontend Integration

Update your frontend to call the VPN node API:

```javascript
async function connectToNode(userId) {
  const response = await fetch('http://YOUR_VM_IP:8000/generate-peer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate peer configuration');
  }

  const data = await response.json();
  
  // Download configuration file
  const blob = new Blob([data.config], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wireguard.conf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
```

## Security Notes

1. Always use HTTPS in production
2. Implement proper authentication
3. Replace the CORS allow_origins with your specific frontend domain
4. Keep WireGuard keys secure
5. Regularly update system packages
