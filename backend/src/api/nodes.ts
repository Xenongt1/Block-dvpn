import express from 'express';
import { ethers } from 'ethers';
import { VPNService } from '../services/VPNService';
import { MetricsCollector } from '../services/MetricsCollector';

const router = express.Router();
const vpnService = new VPNService();
const metricsCollector = new MetricsCollector();

// Get list of active nodes
router.get('/active', async (req, res) => {
  try {
    const nodes = vpnService.getAllActiveSessions();
    res.json({ nodes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active nodes' });
  }
});

// Get node metrics
router.get('/:nodeAddress/metrics', async (req, res) => {
  try {
    const { nodeAddress } = req.params;
    const metrics = metricsCollector.getLatestMetrics(nodeAddress);
    if (!metrics) {
      return res.status(404).json({ error: 'No metrics found for node' });
    }
    res.json({ metrics });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch node metrics' });
  }
});

// Connect to node
router.post('/connect', async (req, res) => {
  try {
    const { nodeAddress, userAddress } = req.body;
    if (!nodeAddress || !userAddress) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const session = await vpnService.connectToNode(nodeAddress, userAddress);
    // Start collecting metrics for this node
    metricsCollector.startCollecting(nodeAddress);
    
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect to node' });
  }
});

// Disconnect from node
router.post('/disconnect', async (req, res) => {
  try {
    const { userAddress } = req.body;
    if (!userAddress) {
      return res.status(400).json({ error: 'Missing user address' });
    }

    await vpnService.disconnectFromNode(userAddress);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect from node' });
  }
});

// Get node status
router.get('/:nodeAddress/status', async (req, res) => {
  try {
    const { nodeAddress } = req.params;
    const metrics = metricsCollector.getLatestMetrics(nodeAddress);
    const session = vpnService.getActiveSession(nodeAddress);

    res.json({
      isActive: !!session,
      metrics,
      lastSeen: metrics?.timestamp || null,
      connectionCount: vpnService.getAllActiveSessions().filter(s => s.nodeAddress === nodeAddress).length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get node status' });
  }
});

export default router; 