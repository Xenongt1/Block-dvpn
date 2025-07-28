import express, { Request, Response, Router, RequestHandler } from 'express';
import { WireGuardController } from '../wireguard/wireguard';

interface ConnectRequest {
  user_id: string;
}

interface EndpointUpdateRequest {
  user_id: string;
  endpoint: string;
}

const router: Router = express.Router();
const wireguard = new WireGuardController();

// Test activation endpoint
const testActivationHandler: RequestHandler = async (req, res) => {
  try {
    const { user_address } = req.query;
    if (!user_address) {
      res.status(400).json({ error: 'User address is required' });
      return;
    }

    // Step 1: Create and activate peer
    console.log(`Creating peer for user address: ${user_address}`);
    const connection = await wireguard.setupConnection(user_address as string);
    
    // Step 2: Wait a moment for activation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Check connection status
    console.log('Checking connection status...');
    const status = await wireguard.getStatus(user_address as string);
    
    // Step 4: Return comprehensive status
    res.json({
      success: true,
      message: 'VPN connection test completed',
      connection_details: connection,
      status,
      is_active: status && 'latestHandshake' in status,
      allowed_ips: status && 'allowedIPs' in status ? status.allowedIPs : 'Not set'
    });
  } catch (error) {
    console.error('Error testing VPN activation:', error);
    res.status(500).json({ error: 'Failed to test VPN activation' });
  }
};

// Start VPN connection
const connectHandler: RequestHandler<{}, any, ConnectRequest> = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const connection = await wireguard.setupConnection(user_id);
    res.json({
      success: true,
      message: 'VPN connection established',
      ...connection
    });
  } catch (error) {
    console.error('Error connecting to VPN:', error);
    res.status(500).json({ error: 'Failed to establish VPN connection' });
  }
};

// Disconnect VPN
const disconnectHandler: RequestHandler<{}, any, ConnectRequest> = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    await wireguard.removeConnection(user_id);
    res.json({ success: true, message: 'VPN connection terminated' });
  } catch (error) {
    console.error('Error disconnecting from VPN:', error);
    res.status(500).json({ error: 'Failed to terminate VPN connection' });
  }
};

// Get VPN status
const statusHandler: RequestHandler<{ userId?: string }> = async (req, res) => {
  try {
    const userId = req.params.userId;
    const status = await wireguard.getStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('Error getting VPN status:', error);
    res.status(500).json({ error: 'Failed to get VPN status' });
  }
};

// Update peer endpoint
const updateEndpointHandler: RequestHandler<{}, any, EndpointUpdateRequest> = async (req, res) => {
  try {
    const { user_id, endpoint } = req.body;
    if (!user_id || !endpoint) {
      res.status(400).json({ error: 'User ID and endpoint are required' });
      return;
    }

    await wireguard.updatePeerEndpoint(user_id, endpoint);
    res.json({ success: true, message: 'Peer endpoint updated' });
  } catch (error) {
    console.error('Error updating peer endpoint:', error);
    res.status(500).json({ error: 'Failed to update peer endpoint' });
  }
};

router.get('/test-activation', testActivationHandler);
router.post('/connect', connectHandler);
router.post('/disconnect', disconnectHandler);
router.get('/status/:userId?', statusHandler);
router.put('/endpoint', updateEndpointHandler);

export default router; 