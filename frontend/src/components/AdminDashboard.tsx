import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers, ContractTransactionResponse } from 'ethers';
import type { TransactionResponse } from 'ethers';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Alert,
  Stack,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  CircularProgress,
  Rating,
  Avatar,
  LinearProgress,
  Divider,
  Fab,
  useScrollTrigger
} from '@mui/material';
import { useWeb3 } from '../context/Web3Context';
import { StorageService } from '../services/StorageService';
import { metricsService } from '../services/MetricsService';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AddIcon from '@mui/icons-material/Add';
import { nodeService, PendingNode } from '../services/NodeService';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ 
          p: 3,
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.3)',
            },
          },
        }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const AdminDashboard = (): JSX.Element => {
  const { contract, account, isConnected, isSuperAdmin, isAdmin, addAdmin, removeAdmin, getAdmins } = useWeb3();
  const [tabValue, setTabValue] = useState(isSuperAdmin ? 3 : 0);
  const [nodes, setNodes] = useState<any[]>([]);
  const [pendingNodes, setPendingNodes] = useState<PendingNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
  const [recentConnections, setRecentConnections] = useState<string[]>([]);
  const [favoriteNodes, setFavoriteNodes] = useState<string[]>([]);
  const [registerDialog, setRegisterDialog] = useState(false);
  const [newNodeAddress, setNewNodeAddress] = useState('');
  const [newNodeIP, setNewNodeIP] = useState('');
  const [newNodeFriendlyName, setNewNodeFriendlyName] = useState('');
  const [newNodeCountry, setNewNodeCountry] = useState('');
  const [adminDialog, setAdminDialog] = useState(false);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [adminList, setAdminList] = useState<any[]>([]);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [removeAdminDialog, setRemoveAdminDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        if (isConnected && (isAdmin || isSuperAdmin)) {
          console.log('[Debug] Loading admin list...');
          const admins = await getAdmins();
          console.log('[Debug] Admins loaded:', admins);
          
          // Get the super admin address
          const superAdminAddress = await contract?.admin();
          console.log('[Debug] Super admin address:', superAdminAddress);
          
          setAdminList(admins.map(admin => ({
            address: admin,
            isSuperAdmin: superAdminAddress?.toLowerCase() === admin.toLowerCase()
          })));
        }
      } catch (err) {
        console.error('[Debug] Error loading admin list:', err);
        setError('Failed to load admin list');
        setShowError(true);
      }
    };

    loadAdminData();
  }, [isConnected, isAdmin, isSuperAdmin, getAdmins, contract]);

  useEffect(() => {
    if (isConnected) {
      loadData();
      
      // Subscribe to real-time updates
      nodeService.addEventListener('newPendingNode', handleNewPendingNode);
      nodeService.addEventListener('nodeStatusUpdate', handleNodeStatusUpdate);
      
      return () => {
        // Cleanup listeners
        nodeService.removeEventListener('newPendingNode', handleNewPendingNode);
        nodeService.removeEventListener('nodeStatusUpdate', handleNodeStatusUpdate);
      };
    }
  }, [isConnected, contract]);

  useEffect(() => {
    if (error) {
      setShowError(true);
      // Auto-hide error after 6 seconds
      const timer = setTimeout(() => {
        setShowError(false);
        setError(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      setShowSuccess(true);
      // Auto-hide success after 6 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setSuccess(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleNewPendingNode = (node: PendingNode) => {
    setPendingNodes(current => [...current, node]);
  };

  const handleNodeStatusUpdate = (update: { address: string; status: string }) => {
    if (update.status === 'approved') {
      // Remove from pending nodes and add to active nodes
      setPendingNodes(current => 
        current.filter(node => node.address !== update.address)
      );
      loadData(); // Reload active nodes
    } else if (update.status === 'rejected') {
      // Remove from pending nodes
      setPendingNodes(current => 
        current.filter(node => node.address !== update.address)
      );
    }
  };

  const loadData = async () => {
    try {
      if (contract) {
        // Load pending nodes first
        console.log('[Debug] Loading pending nodes...');
        const pendingNodesList = await nodeService.getPendingNodes();
        console.log('[Debug] Pending nodes loaded:', pendingNodesList);
        setPendingNodes(pendingNodesList);

        // Load active nodes from contract
        const activeNodes = await contract.getActiveNodes();
        
        if (activeNodes.length === 0) {
          setNodes([]);
          return;
        }

        // Only proceed with getTopNodes if there are active nodes
        const [nodeAddresses] = await contract.getTopNodes(100);
        const nodeDetails = await Promise.all(
          nodeAddresses.map(async (address: string) => {
            const details = await contract.getNodeDetails(address);
            return {
              address,
              ipAddress: details[0],
              owner: details[1],
              totalScore: Number(details[2]),
              isRegistered: details[3],
              isActive: details[4],
              latency: Number(details[5]),
              bandwidth: 0,
              uptime: 0,
              reliability: 0
            };
          })
        );
        setNodes(nodeDetails.filter(node => node.isActive));

        // Load admin list if super admin
        if (isSuperAdmin) {
          const admins = await getAdmins();
          setAdminList(admins);
        }
      }

      // Load local storage data
      setPerformanceHistory(StorageService.getPerformanceHistory());
      setRecentConnections(StorageService.getRecentConnections());
      setFavoriteNodes(StorageService.getFavoriteNodes());
    } catch (err) {
      console.error('[Debug] Error loading data:', err);
      setError('Failed to load data');
    }
  };

  const handleRegisterNode = async () => {
    if (!account || !contract) {
      setError('Contract not initialized or account not connected');
      return;
    }

    try {
      setError(null);
      
      // Validate address format
      if (!newNodeAddress || !newNodeAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        setError('Invalid node address format. Please provide a valid Ethereum address.');
        return;
      }

      // Validate IP address format and check if it's a real IP
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!newNodeIP || !ipRegex.test(newNodeIP)) {
        setError('Invalid IP address format. Please provide a valid IPv4 address.');
        return;
      }

      // Additional validation for IP address values
      const ipParts = newNodeIP.split('.');
      const isValidIP = ipParts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });

      if (!isValidIP) {
        setError('Invalid IP address values. Each part must be between 0 and 255.');
        return;
      }

      // Check if node is already registered in smart contract
      console.log('[Debug] Checking if node is already registered:', newNodeAddress);
      let isRegistered = false;
      let isActive = false;
      
      try {
        const nodeDetails = await contract.getNodeDetails(newNodeAddress);
        [, , , isRegistered, isActive] = nodeDetails;
        
        if (isRegistered) {
          if (isActive) {
            setError('This node is already registered and active in the smart contract.');
          } else {
            setError('This node is registered but inactive. Please reactivate it instead of registering again.');
          }
          return;
        }
      } catch (err: any) {
        // Only proceed if the error is specifically about the node not existing
        if (!err.message.includes('Node does not exist')) {
          console.error('[Debug] Error checking node registration:', err);
          setError('Failed to check node registration status. Please try again.');
          return;
        }
        console.log('[Debug] Node not found in registry, proceeding with registration');
      }

      // Register in smart contract first
      console.log('[Debug] Registering node in smart contract...');
      const tx = await contract.registerNode(newNodeAddress, newNodeIP) as ContractTransactionResponse;
      console.log('[Debug] Transaction sent:', tx.hash);
      await tx.wait();
      console.log('[Debug] Transaction confirmed');

      // Now register in backend
      console.log('[Debug] Registering node in backend...');
      const registered = await nodeService.registerNode(
        newNodeAddress,
        newNodeIP,
        account,
        newNodeFriendlyName || 'Unnamed Node',
        newNodeCountry || 'Unknown'
      );
      
      if (!registered) {
        console.error('[Debug] Backend registration failed');
        // If backend registration fails, deactivate the node in smart contract
        await contract.deactivateNode(newNodeAddress);
        throw new Error('NODE_REGISTRATION_FAILED');
      }

      console.log('[Debug] Node registration complete');
      
      // Add to pending nodes list
      const newNode: PendingNode = {
        address: newNodeAddress,
        ipAddress: newNodeIP,
        owner: account,
        friendlyName: newNodeFriendlyName || 'Unnamed Node',
        country: newNodeCountry || 'Unknown',
        status: 'pending' as const,
        submission_time: new Date().toISOString(),
        publicKey: '', // Will be generated by the node
        price: '0', // Default free
        capacity: 100, // Default capacity
        currentLoad: 0, // Initial load
        supportedProtocols: ['wireguard'], // Default protocol
        apiPort: 8000, // Default API port
        wireguardPort: 51820 // Default WireGuard port
      };
      
      setPendingNodes(current => [...current, newNode]);
      setSuccess('Node registered successfully! Waiting for admin approval.');
      setRegisterDialog(false);
      setNewNodeAddress('');
      setNewNodeIP('');
      setNewNodeFriendlyName('');
      setNewNodeCountry('');
      
    } catch (err: any) {
      console.error('[Debug] Node registration error:', err);
      if (err instanceof Error) {
        if (err.message === 'NODE_REGISTRATION_FAILED') {
          setError('Failed to register node in backend. Node registration has been rolled back.');
        } else if (err.message.includes('bad address checksum')) {
          setError('Invalid Ethereum address format. Please verify the address is correct.');
        } else if (err.message.includes('invalid address')) {
          setError('The provided node address is not a valid Ethereum address.');
        } else if (err.message.includes('execution reverted')) {
          setError('Smart contract registration failed. Please verify the node and IP address are valid.');
        } else {
          setError(`Failed to register node: ${err.message}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleApproveNode = async (nodeAddress: string) => {
    try {
      if (!contract) return;
      setError(null);
      
      console.log('[Debug] Approving node:', nodeAddress);
      
      // Update status in backend first
      const backendUpdate = await nodeService.updateNodeStatus(nodeAddress, 'approved');
      if (!backendUpdate) {
        throw new Error('Failed to update node status in backend');
      }
      
      // Approve in smart contract
      const tx = await contract.approveNode(nodeAddress) as ContractTransactionResponse;
      await tx.wait();
      
      setSuccess('Node approved successfully');
      console.log('[Debug] Node approved successfully:', nodeAddress);
      
      // Refresh the data
      loadData();
    } catch (err: any) {
      console.error('[Debug] Error approving node:', err);
      setError(err.message || 'Failed to approve node');
    }
  };

  const handleDeactivateNode = async (nodeAddress: string) => {
    try {
      if (!contract) return;
      setError(null);
      
      console.log('[Debug] Deactivating node:', nodeAddress);
      
      // Update status in backend
      const backendUpdate = await nodeService.updateNodeStatus(nodeAddress, 'rejected');
      if (!backendUpdate) {
        throw new Error('Failed to update node status in backend');
      }
      
      // Deactivate in smart contract
      const tx = await contract.deactivateNode(nodeAddress) as ContractTransactionResponse;
      await tx.wait();
      
      setSuccess('Node deactivated successfully');
      console.log('[Debug] Node deactivated successfully:', nodeAddress);
      
      // Refresh the data
      loadData();
    } catch (err: any) {
      console.error('[Debug] Error deactivating node:', err);
      setError(err.message || 'Failed to deactivate node');
    }
  };

  const handleRemoveAdmin = async () => {
    if (!selectedAdmin) return;
    
    try {
      await removeAdmin(selectedAdmin);
      setSuccess(`Successfully removed ${selectedAdmin} from admins`);
      setShowSuccess(true);
      setRemoveAdminDialog(false);
      setSelectedAdmin(null);
      
      // Refresh admin list
      const admins = await getAdmins();
      setAdminList(admins);
    } catch (err: any) {
      setError(err.message || 'Failed to remove admin');
      setShowError(true);
    }
  };

  const handleAddAdmin = async () => {
    try {
      await addAdmin(newAdminAddress);
      setSuccess(`Successfully added ${newAdminAddress} as admin`);
      setShowSuccess(true);
      setAdminDialog(false);
      setNewAdminAddress('');
      
      // Refresh admin list
      const admins = await getAdmins();
      setAdminList(admins);
    } catch (err: any) {
      setError(err.message || 'Failed to add admin');
      setShowError(true);
    }
  };

  const renderNodeManagement = () => (
  <Box>
    <Box sx={{ overflowX: 'auto' }}>
      <Table sx={{ minWidth: 1000 }}>
        <TableHead>
          <TableRow>
            <TableCell width="25%">Address</TableCell>
            <TableCell width="20%">IP Address</TableCell>
            <TableCell width="25%">Owner</TableCell>
            <TableCell width="15%">Status</TableCell>
            <TableCell width="15%">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {nodes.map((node, index) => (
            <TableRow key={`${node.address}-${index}`}>
              <TableCell>{node.address}</TableCell>
              <TableCell>{node.ipAddress}</TableCell>
              <TableCell>{node.owner}</TableCell>
              <TableCell>
                <Chip 
                  label={node.isActive ? "Active" : "Inactive"}
                  color={node.isActive ? "success" : "error"}
                  icon={node.isActive ? <CheckCircleIcon /> : <BlockIcon />}
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => handleDeactivateNode(node.address)}
                >
                  Deactivate
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  </Box>
);


  const renderPendingNodes = () => (
  <Box>
    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="h6">Pending Node Requests</Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setRegisterDialog(true)}
        sx={{
          background: 'linear-gradient(45deg, #2196f3, #1976d2)',
          '&:hover': {
            background: 'linear-gradient(45deg, #1976d2, #1565c0)'
          }
        }}
      >
        Register New Node
      </Button>
    </Box>
    <Box sx={{ overflowX: 'auto' }}>
      <Table sx={{ minWidth: 1200 }}>
        <TableHead>
          <TableRow>
            <TableCell width="20%">Address</TableCell>
            <TableCell width="15%">IP Address</TableCell>
            <TableCell width="20%">Owner</TableCell>
            <TableCell width="15%">Details</TableCell>
            <TableCell width="15%">Submission Time</TableCell>
            <TableCell width="15%">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pendingNodes.map((node, index) => (
            <TableRow key={`${node.address}-${index}-${node.submission_time}`}>
              <TableCell>{node.address}</TableCell>
              <TableCell>{node.ipAddress}</TableCell>
              <TableCell>{node.owner}</TableCell>
              <TableCell>
                <Typography variant="body2" color="textSecondary">
                  {node.friendlyName}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {node.country}
                </Typography>
              </TableCell>
              <TableCell>{new Date(node.submission_time).toLocaleString()}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleApproveNode(node.address)}
                    sx={{ minWidth: '100px' }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleDeactivateNode(node.address)}
                    sx={{ minWidth: '100px' }}
                  >
                    Reject
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          ))}
          {pendingNodes.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Typography variant="body2" color="text.secondary">
                  No pending node requests
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  </Box>
);


  const renderPerformanceMetrics = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Network Performance
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Node</TableCell>
                  <TableCell>Latency</TableCell>
                  <TableCell>Bandwidth</TableCell>
                  <TableCell>Uptime</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {performanceHistory.slice(-5).map((record, index) => (
                  <TableRow key={index}>
                    <TableCell>{record.nodeAddress.slice(0, 6)}...{record.nodeAddress.slice(-4)}</TableCell>
                    <TableCell>
                      {record.latency}ms
                      {record.latency > 100 && (
                        <TrendingUpIcon color="error" fontSize="small" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {record.bandwidth}Mbps
                      {record.bandwidth < 50 && (
                        <TrendingDownIcon color="error" fontSize="small" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>{record.uptime}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Stack spacing={2}>
              {recentConnections.map((nodeAddress, index) => (
                <Box key={index} display="flex" alignItems="center">
                  <AccessTimeIcon sx={{ mr: 1 }} />
                  <Typography>
                    Connection to {nodeAddress.slice(0, 6)}...{nodeAddress.slice(-4)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (!isConnected || !account) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Please connect your wallet to access admin dashboard</Typography>
      </Box>
    );
  }

  if (!isAdmin && !isSuperAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>You do not have admin access to this dashboard</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      mt: { xs: 8, sm: 9 }, // Add margin top to account for the header
      px: { xs: 2, sm: 3, md: 4 }, // Add horizontal padding
      pb: 4 // Add bottom padding
    }}>
      {/* Back Button */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/nodes')}
          sx={{
            color: 'primary.main',
            borderColor: 'rgba(255, 255, 255, 0.23)',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'rgba(144, 202, 249, 0.08)'
            }
          }}
        >
          Back to Available Nodes
        </Button>
      </Box>

      {/* Error and Success Snackbars */}
      <Snackbar 
        open={showError} 
        autoHideDuration={6000} 
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: '80px !important' }}
      >
        <Alert 
          severity="error" 
          variant="filled"
          onClose={() => setShowError(false)}
          sx={{ 
            width: '100%',
            borderRadius: 2,
            boxShadow: 3,
            '& .MuiAlert-message': {
              fontSize: '0.95rem'
            }
          }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={showSuccess} 
        autoHideDuration={6000} 
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: '80px !important' }}
      >
        <Alert 
          severity="success"
          variant="filled"
          onClose={() => setShowSuccess(false)}
          sx={{ 
            width: '100%',
            borderRadius: 2,
            boxShadow: 3,
            '& .MuiAlert-message': {
              fontSize: '0.95rem'
            }
          }}
        >
          {success}
        </Alert>
      </Snackbar>

      <Paper 
        elevation={0}
        sx={{ 
          background: 'rgba(17, 25, 54, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Node Management" />
            <Tab label="Pending Nodes" />
            <Tab label="Performance Metrics" />
            <Tab label="Admin Management" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {renderNodeManagement()}
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          {renderPendingNodes()}
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          {renderPerformanceMetrics()}
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Admin Management</Typography>
            {isSuperAdmin && (
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setAdminDialog(true)}
                sx={{
                  background: 'linear-gradient(45deg, #9c27b0, #7c4dff)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #7b1fa2, #673ab7)'
                  }
                }}
              >
                Add New Admin
              </Button>
            )}
          </Box>
          
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Admin Address</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                {isSuperAdmin && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {adminList.map((admin) => {
                const isSuperAdminAddress = admin.isSuperAdmin;
                return (
                  <TableRow key={admin.address}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AdminPanelSettingsIcon 
                          sx={{ 
                            color: isSuperAdminAddress ? 'secondary.main' : 'primary.main' 
                          }} 
                        />
                        {admin.address}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isSuperAdminAddress ? 'Super Admin' : 'Admin'}
                        color={isSuperAdminAddress ? 'secondary' : 'primary'}
                        sx={{
                          background: isSuperAdminAddress 
                            ? 'linear-gradient(45deg, #9c27b0, #7c4dff)' 
                            : 'linear-gradient(45deg, #2196f3, #1976d2)'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label="Active"
                        color="success"
                        size="small"
                        sx={{ borderRadius: '14px' }}
                      />
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell align="right">
                        {isSuperAdminAddress ? (
                          <Tooltip title="Cannot remove super admin">
                            <span>
                              <IconButton disabled>
                                <DeleteIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Remove admin">
                            <IconButton 
                              color="error"
                              onClick={() => {
                                setSelectedAdmin(admin.address);
                                setRemoveAdminDialog(true);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {adminList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 4 : 3} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No admins found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabPanel>
      </Paper>

      {/* Admin Management Dialogs - Only shown for super admins */}
      {isSuperAdmin && (
        <>
          {/* Add Admin Dialog */}
          <Dialog 
            open={adminDialog} 
            onClose={() => setAdminDialog(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                background: 'rgba(17, 25, 54, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2
              }
            }}
          >
            <DialogTitle>Add New Admin</DialogTitle>
            <DialogContent>
              <TextField
                sx={{ mt: 1 }}
                label="Admin Address"
                value={newAdminAddress}
                onChange={(e) => setNewAdminAddress(e.target.value)}
                fullWidth
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAdminDialog(false)}>Cancel</Button>
              <Button onClick={handleAddAdmin} variant="contained">Add Admin</Button>
            </DialogActions>
          </Dialog>

          {/* Remove Admin Dialog */}
          <Dialog 
            open={removeAdminDialog} 
            onClose={() => setRemoveAdminDialog(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                background: 'rgba(17, 25, 54, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2
              }
            }}
          >
            <DialogTitle>Remove Admin</DialogTitle>
            <DialogContent>
              <Typography sx={{ mt: 1 }}>
                Are you sure you want to remove this admin?
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {selectedAdmin}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRemoveAdminDialog(false)}>Cancel</Button>
              <Button 
                onClick={handleRemoveAdmin}
                variant="contained" 
                color="error"
              >
                Remove Admin
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* Register Node Dialog */}
      <Dialog 
        open={registerDialog} 
        onClose={() => setRegisterDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(17, 25, 54, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle>Register New Node</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Node Address"
              value={newNodeAddress}
              onChange={(e) => setNewNodeAddress(e.target.value)}
              fullWidth
              placeholder="0x..."
            />
            <TextField
              label="IP Address"
              value={newNodeIP}
              onChange={(e) => setNewNodeIP(e.target.value)}
              fullWidth
              placeholder="xxx.xxx.xxx.xxx"
            />
            <TextField
              label="Friendly Name"
              value={newNodeFriendlyName}
              onChange={(e) => setNewNodeFriendlyName(e.target.value)}
              fullWidth
              placeholder="e.g. Fast Node US-East"
            />
            <TextField
              label="Country"
              value={newNodeCountry}
              onChange={(e) => setNewNodeCountry(e.target.value)}
              fullWidth
              placeholder="e.g. United States"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleRegisterNode} 
            variant="contained"
            disabled={!newNodeAddress || !newNodeIP}
          >
            Register Node
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 
