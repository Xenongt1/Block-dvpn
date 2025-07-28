import { Router } from 'express';
import { getRepository } from '../database/init';
import { VPNNode } from '../models/VPNNode';

const router = Router();

// Get all nodes
router.get('/', async (req, res) => {
  try {
    const nodeRepository = getRepository<VPNNode>(VPNNode);
    const nodes = await nodeRepository.find({
      relations: ['metrics']
    });
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

// Get node by address
router.get('/:address', async (req, res) => {
  try {
    const nodeRepository = getRepository<VPNNode>(VPNNode);
    const node = await nodeRepository.findOne({
      where: { address: req.params.address },
      relations: ['metrics']
    });
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.json(node);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch node' });
  }
});

// Update node status
router.patch('/:address', async (req, res) => {
  try {
    const nodeRepository = getRepository<VPNNode>(VPNNode);
    const { isActive } = req.body;
    
    const node = await nodeRepository.findOne({
      where: { address: req.params.address }
    });
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    await nodeRepository.update(req.params.address, { isActive });
    res.json({ message: 'Node updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update node' });
  }
});

export const nodeRoutes = router; 