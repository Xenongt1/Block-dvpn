import { Router } from 'express';
import { getRepository } from '../database/init';
import { NodeMetrics } from '../models/NodeMetrics';
import { VPNNode } from '../models/VPNNode';

const router = Router();

// Get metrics for a node
router.get('/node/:address', async (req, res) => {
  try {
    const metricsRepository = getRepository<NodeMetrics>(NodeMetrics);
    const metrics = await metricsRepository.find({
      where: { node: { address: req.params.address } },
      order: { timestamp: 'DESC' },
      take: 100
    });
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Add new metrics for a node
router.post('/node/:address', async (req, res) => {
  try {
    const nodeRepository = getRepository<VPNNode>(VPNNode);
    const metricsRepository = getRepository<NodeMetrics>(NodeMetrics);
    
    const node = await nodeRepository.findOne({
      where: { address: req.params.address }
    });
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const { latency, bandwidth, uptime, reliability } = req.body;
    
    const metrics = metricsRepository.create({
      node,
      latency,
      bandwidth,
      uptime,
      reliability
    });
    
    await metricsRepository.save(metrics);
    res.status(201).json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save metrics' });
  }
});

export const metricsRoutes = router; 