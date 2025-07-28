import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Stack,
  Alert,
  Grid,
} from '@mui/material';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import type { TransactionResponse } from 'ethers';
import { SubscriptionServiceFactory, ISubscriptionService } from '../services/SubscriptionServiceFactory';

const AdminPanel: React.FC = () => {
  const { contract, account, isAdmin: isAdminFromContext, provider, signer } = useWeb3();
  const [openDialog, setOpenDialog] = useState(false);
  const [updateNodeDialog, setUpdateNodeDialog] = useState(false);
  const [selectedNode, setSelectedNode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [subscriptionService, setSubscriptionService] = useState<ISubscriptionService | null>(null);

  // Admin management form states
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [removeAdminAddress, setRemoveAdminAddress] = useState('');
  const [newSuperAdminAddress, setNewSuperAdminAddress] = useState('');

  // Register Node Form
  const [nodeAddress, setNodeAddress] = useState('');
  const [ipAddress, setIpAddress] = useState('');

  // Update Metrics Form
  const [metrics, setMetrics] = useState({
    latency: 50,
    bandwidth: 100,
    uptime: 99,
    reliability: 95,
  });

  useEffect(() => {
    const initService = async () => {
      try {
        if (!provider || !signer) return;
        const service = await SubscriptionServiceFactory.getInstance(provider, signer as ethers.JsonRpcSigner);
        setSubscriptionService(service);
      } catch (err) {
        console.error('Error initializing service:', err);
        setError('Failed to initialize service');
      }
    };
    initService();
  }, []);

  const handleRegisterNode = async () => {
    if (!contract) return;
    
    try {
      setError(null);
      const tx = await contract.registerNode(nodeAddress, ipAddress) as TransactionResponse;
      await tx.wait();
      setSuccess('Node registered successfully!');
      setOpenDialog(false);
      setNodeAddress('');
      setIpAddress('');
    } catch (error) {
      console.error('Error registering node:', error);
      setError('Failed to register node');
    }
  };

  const handleApproveNode = async (address: string) => {
    if (!contract) return;
    
    try {
      setError(null);
      const tx = await contract.approveNode(address) as TransactionResponse;
      await tx.wait();
      setSuccess('Node approved successfully!');
    } catch (error) {
      console.error('Error approving node:', error);
      setError('Failed to approve node');
    }
  };

  const handleDeactivateNode = async (address: string) => {
    if (!contract) return;
    
    try {
      setError(null);
      const tx = await contract.deactivateNode(address) as TransactionResponse;
      await tx.wait();
      setSuccess('Node deactivated successfully!');
    } catch (error) {
      console.error('Error deactivating node:', error);
      setError('Failed to deactivate node');
    }
  };

  const handleUpdateMetrics = async () => {
    if (!contract || !selectedNode) return;
    
    try {
      setError(null);
      const tx = await contract.updateNodeMetrics(
        selectedNode,
        BigInt(metrics.latency),
        BigInt(metrics.bandwidth),
        BigInt(metrics.uptime),
        BigInt(metrics.reliability)
      ) as TransactionResponse;
      await tx.wait();
      setSuccess('Node metrics updated successfully!');
      setUpdateNodeDialog(false);
    } catch (error) {
      console.error('Error updating metrics:', error);
      setError('Failed to update metrics');
    }
  };

  const handleAddAdmin = async () => {
    if (!subscriptionService) return;
    
    try {
      setError(null);
      setSuccess(null);
      
      if (!newAdminAddress) {
        setError('Please enter an address');
        return;
      }

      await subscriptionService.addAdmin(newAdminAddress);
      setSuccess(`Successfully added ${newAdminAddress} as admin`);
      setNewAdminAddress('');
    } catch (err: any) {
      setError(err.message || 'Failed to add admin');
    }
  };

  const handleRemoveAdmin = async () => {
    if (!subscriptionService) return;
    
    try {
      setError(null);
      setSuccess(null);

      if (!removeAdminAddress) {
        setError('Please enter an address');
        return;
      }

      await subscriptionService.removeAdmin(removeAdminAddress);
      setSuccess(`Successfully removed ${removeAdminAddress} from admins`);
      setRemoveAdminAddress('');
    } catch (err: any) {
      setError(err.message || 'Failed to remove admin');
    }
  };

  const handleTransferSuperAdmin = async () => {
    if (!subscriptionService) return;
    
    try {
      setError(null);
      setSuccess(null);

      if (!newSuperAdminAddress) {
        setError('Please enter an address');
        return;
      }

      await subscriptionService.transferSuperAdmin(newSuperAdminAddress);
      setSuccess(`Successfully transferred super admin role to ${newSuperAdminAddress}`);
      setNewSuperAdminAddress('');
    } catch (err: any) {
      setError(err.message || 'Failed to transfer super admin role');
    }
  };

  if (!isAdminFromContext) {
    return null;
  }

  return (
    <Paper sx={{ p: 3, m: 3 }}>
      <Typography variant="h5" gutterBottom>
        Admin Panel
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Node Management Section */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Node Management
          </Typography>
          <Button
            variant="contained"
            onClick={() => setOpenDialog(true)}
            sx={{ mb: 2 }}
          >
            Register New Node
          </Button>
        </Grid>
      </Grid>

      {/* Register Node Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Register New Node</DialogTitle>
        <DialogContent>
          <TextField
            label="Node Address"
            value={nodeAddress}
            onChange={(e) => setNodeAddress(e.target.value)}
            fullWidth
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            label="IP Address"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleRegisterNode} variant="contained">
            Register
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Node Metrics Dialog */}
      <Dialog
        open={updateNodeDialog}
        onClose={() => setUpdateNodeDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Node Metrics</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Box>
              <Typography gutterBottom>Latency (ms)</Typography>
              <Slider
                value={metrics.latency}
                onChange={(_, value) =>
                  setMetrics({ ...metrics, latency: value as number })
                }
                min={0}
                max={1000}
              />
            </Box>
            <Box>
              <Typography gutterBottom>Bandwidth (Mbps)</Typography>
              <Slider
                value={metrics.bandwidth}
                onChange={(_, value) =>
                  setMetrics({ ...metrics, bandwidth: value as number })
                }
                min={0}
                max={1000}
              />
            </Box>
            <Box>
              <Typography gutterBottom>Uptime (%)</Typography>
              <Slider
                value={metrics.uptime}
                onChange={(_, value) =>
                  setMetrics({ ...metrics, uptime: value as number })
                }
                min={0}
                max={100}
              />
            </Box>
            <Box>
              <Typography gutterBottom>Reliability (%)</Typography>
              <Slider
                value={metrics.reliability}
                onChange={(_, value) =>
                  setMetrics({ ...metrics, reliability: value as number })
                }
                min={0}
                max={100}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateNodeDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateMetrics} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AdminPanel; 