import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  AlertColor,
  Chip,
  Rating,
  Grid,
  Stack,
  Container,
  Card,
  CardContent,
  CardActions,
  Fade,
  Grow,
  Zoom,
  Collapse,
  Avatar,
  LinearProgress,
  Divider,
  Fab,
  useScrollTrigger,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Modal
} from '@mui/material';
import { useWeb3 } from '../context/Web3Context';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import type { TransactionResponse } from 'ethers';
import { SubscriptionDialog } from '../components/SubscriptionDialog';
import AddIcon from '@mui/icons-material/Add';
import { nodeService } from '../services/NodeService';
import { vpnConnectionService } from '../services/VPNConnectionService';
import { WireGuardService } from '../services/WireGuardService';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useVPNContext } from '../contexts/VPNContext';

interface VPNNode {
  address: string;
  ipAddress: string;
  latency: number;
  bandwidth: number;
  uptime: number;
  reliability: number;
  totalScore: number;
  country?: string;
  publicKey?: string;
  apiPort?: number;
  wireguardPort?: number;
  apiUrl?: string;
  apiKey?: string;
  owner?: string;
  isActive?: boolean;
  isRegistered?: boolean;
  friendlyName?: string;
}

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
}

interface InstallationInstructions {
  downloadUrl: string;
  instructions: string[];
}

interface VPNConfig {
  config: string;
  nodeAddress: string;
  nodeIP: string;
  qr_code?: string;
  connection_info?: {
    client_ip: string;
    server_endpoint: string;
    expires_at: string;
  };
  subscription?: {
    is_active: boolean;
    expiry_date: string;
    expiry_timestamp: number;
    remaining_time: number;
  };
}

// Scroll to top component
function ScrollTop() {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Zoom in={trigger}>
      <Box
        onClick={handleClick}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
      >
        <Fab 
          color="primary" 
          size="small" 
          aria-label="scroll back to top"
          sx={{
            background: 'linear-gradient(45deg, #2196f3 30%, #1976d2 90%)',
          }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Box>
    </Zoom>
  );
}

const NodeCard = ({ node, onConnect, index }: { node: VPNNode, onConnect: (address: string) => void, index: number }) => {
  const [showDetails, setShowDetails] = useState(false);
  const { connectedNodeAddress, isConnecting } = useVPNContext();
  const isConnected = connectedNodeAddress === node.address;
  const isLoading = isConnecting && connectedNodeAddress === node.address;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnect(node.address); // This will handle both connect and disconnect
  };
  
  return (
    <Grow in style={{ transformOrigin: '0 0 0', transitionDelay: `${index * 100}ms` }}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isConnected ? 'rgba(124, 77, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          border: isConnected ? '1px solid rgba(124, 77, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-5px)',
            backgroundColor: isConnected ? 'rgba(124, 77, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            cursor: 'pointer'
          }
        }}
        onClick={handleClick}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Stack spacing={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar 
                  sx={{ 
                    bgcolor: 'transparent',
                    border: '2px solid',
                    borderColor: 'primary.main',
                    p: 0.5
                  }}
                >
                  <VerifiedUserIcon color="primary" />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Node Name
                  </Typography>
                  <Typography variant="h6">
                    {node.friendlyName || `Node ${node.address.slice(0, 6)}...${node.address.slice(-4)}`}
                    {node.country && ` - ${node.country}`}
                  </Typography>
                </Box>
              </Stack>
              {node.country && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" color="text.secondary">
                    Location:
                  </Typography>
                  <Chip
                    label={node.country}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'text.primary',
                      '& .MuiChip-label': {
                        px: 1
                      }
                    }}
                  />
                </Box>
              )}
              <TrendingUpIcon 
                sx={{ 
                  color: node.reliability > 95 ? '#4caf50' : '#ff9800',
                  fontSize: 28
                }} 
              />
            </Box>
            
            <Stack spacing={2}>
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" color="text.secondary">Latency</Typography>
                  <Typography variant="body2" color={node.latency < 50 ? '#4caf50' : '#ff9800'}>
                    {node.latency}ms
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min((1 - node.latency/200) * 100, 100)} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #9c27b0, #7c4dff)'
                    }
                  }}
                />
              </Box>
              
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" color="text.secondary">Reliability</Typography>
                  <Typography variant="body2" color={node.reliability > 95 ? '#4caf50' : '#ff9800'}>
                    {node.reliability}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={node.reliability} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #7c4dff, #2196f3)'
                    }
                  }}
                />
              </Box>
              
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" color="text.secondary">Score</Typography>
                  <Rating 
                    value={node.totalScore / 20} 
                    readOnly 
                    precision={0.5} 
                    size="small"
                    sx={{
                      '& .MuiRating-iconFilled': {
                        color: '#7c4dff'
                      }
                    }}
                  />
                </Box>
              </Box>
            </Stack>

            <Collapse in={showDetails}>
              <Stack spacing={2}>
                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                <Typography variant="subtitle2" color="primary" sx={{ opacity: 0.8 }}>
                  Additional Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Bandwidth</Typography>
                    <Typography variant="body2">{node.bandwidth} Mbps</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Uptime</Typography>
                    <Typography variant="body2">{node.uptime}%</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">IP Address</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{node.ipAddress}</Typography>
                  </Grid>
                </Grid>
              </Stack>
            </Collapse>
          </Stack>
        </CardContent>
        
        <CardActions sx={{ p: 2, pt: 0, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            fullWidth 
            disabled={isLoading}
            onClick={handleClick}
            startIcon={isLoading ? null : isConnected ? <CheckCircleIcon /> : <ArrowForwardIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              py: 1.5,
              background: isConnected 
                ? 'linear-gradient(45deg, #4caf50, #45a049)'
                : 'linear-gradient(45deg, #9c27b0, #7c4dff)',
              transition: 'all 0.3s ease',
              opacity: 0.9,
              '&:hover': {
                transform: 'scale(1.02)',
                opacity: 1,
                boxShadow: isConnected 
                  ? '0 4px 20px rgba(76, 175, 80, 0.4)'
                  : '0 4px 20px rgba(124, 77, 255, 0.4)'
              },
              '&:disabled': {
                background: 'rgba(255, 255, 255, 0.12)',
                color: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                {isConnected ? 'Disconnecting...' : 'Connecting...'}
              </Box>
            ) : (
              isConnected ? 'Connected' : 'Connect to Node'
            )}
          </Button>
        </CardActions>
      </Card>
    </Grow>
  );
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export const AvailableNodes: React.FC = () => {
  const navigate = useNavigate();
  const { contract, subscriptionContract, isConnected, connectedNode, isInitialized, account, isAdmin, isSuperAdmin, setConnectedNode } = useWeb3();
  const [nodes, setNodes] = useState<VPNNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [pendingNodeConnection, setPendingNodeConnection] = useState<string | null>(null);
  const [registerDialog, setRegisterDialog] = useState(false);
  const [newNodeAddress, setNewNodeAddress] = useState('');
  const [newNodeIP, setNewNodeIP] = useState('');
  const [newNodeFriendlyName, setNewNodeFriendlyName] = useState('');
  const [newNodeCountry, setNewNodeCountry] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState<{
    nodeAddress: string;
    nodeIP: string;
    nodeFriendlyName: string;
    nodeCountry: string;
  } | null>(null);
  const [showError, setShowError] = useState(false);
  const [vpnConfig, setVpnConfig] = useState<VPNConfig | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [config, setConfig] = useState<string | null>(null);
  const wireGuardService = useMemo(() => new WireGuardService(), []);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installInstructions, setInstallInstructions] = useState<InstallationInstructions | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const { connectedNodeAddress, setConnectedNodeAddress, setIsConnecting } = useVPNContext();

  // Update error handling to show Snackbar
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

  const fetchNodes = useCallback(async () => {
    if (!contract || !isConnected) return;
    
    try {
      setLoading(true);
      setError(null);
      const activeNodes = await contract.getActiveNodes();
      console.log('Active nodes from contract:', activeNodes);  // Debug log
      
      if (activeNodes.length === 0) {
        setNodes([]);
        return;
      }

      // Get unique node addresses
      const uniqueAddresses = new Set(activeNodes);
      const [topNodeAddresses] = await contract.getTopNodes(5);
      console.log('Top nodes from contract:', topNodeAddresses);  // Debug log
      
      // Add any top nodes that aren't already in the set
      topNodeAddresses.forEach(address => uniqueAddresses.add(address));

      // Convert addresses to array and get details for each unique node
      const nodeDetails = await Promise.all(
        Array.from(uniqueAddresses).map(async (address: string) => {
          console.log(`Getting details for node: ${address}`);  // Debug log
          const details = await contract.getNodeDetails(address);
          console.log(`Contract details for ${address}:`, details);  // Debug log
          
          // Get additional details from backend
          const additionalDetails = await nodeService.getNodeDetails(address);
          console.log(`Additional details for ${address}:`, additionalDetails);  // Debug log
          
          const node = {
            address,
            ipAddress: details[0],
            latency: Math.floor(Math.random() * 100),
            bandwidth: Math.floor(Math.random() * 1000),
            uptime: 99.9,
            reliability: 95 + Math.floor(Math.random() * 5),
            totalScore: Number(details[2]),
            // Use additional details if available, otherwise use null
            friendlyName: additionalDetails?.friendlyName || null,
            country: additionalDetails?.country || null
          };
          console.log(`Final node object for ${address}:`, node);  // Debug log
          return node;
        })
      );

      console.log('Setting nodes state with:', nodeDetails);  // Debug log
      setNodes(nodeDetails);
    } catch (err: any) {
      console.error('Error fetching nodes:', err);
      setError(err.message || 'Failed to fetch available nodes');
    } finally {
      setLoading(false);
    }
  }, [contract, isConnected]);

  useEffect(() => {
    if (isInitialized && !isConnected) {
      navigate('/');
      return;
    }

    if (isInitialized && isConnected) {
      fetchNodes();
    }
  }, [isInitialized, isConnected, navigate, fetchNodes]);

  // Add console logs for debugging
  useEffect(() => {
    console.log('AvailableNodes state:', {
      isInitialized,
      isConnected,
      loading,
      error,
      nodesLength: nodes.length
    });
  }, [isInitialized, isConnected, loading, error, nodes]);

  const checkSubscription = async (address: string): Promise<boolean> => {
    if (!subscriptionContract) return false;
    try {
      const hasSubscription = await subscriptionContract.hasActiveSubscription(address);
      return hasSubscription;
    } catch (err) {
      console.error('Error checking subscription:', err);
      return false;
    }
  };

  const handleConnect = async (nodeAddress: string) => {
    try {
      setConnectionError(null);

      // Check if account exists
      if (!account) {
        throw new Error('Please connect your wallet first');
      }

      // Skip subscription check for admins
      if (!isAdmin && !isSuperAdmin) {
        // Check subscription status for regular users
        const hasSubscription = await subscriptionContract?.hasActiveSubscription(account);
        if (!hasSubscription) {
          setShowSubscriptionDialog(true);
          return;
        }
      }
      
      // If clicking the currently connected node, disconnect
      if (connectedNodeAddress === nodeAddress) {
        console.log('🔄 Disconnecting from current node...');
        
        // Get the node's IP address
        const node = nodes.find(n => n.address === nodeAddress);
        if (!node) {
          throw new Error('Node not found');
        }

        // Delete the peer from the VPN node
        await vpnConnectionService.deletePeer(node.ipAddress, account);
        setConnectedNodeAddress(null);
        setSelectedNode(null);
        return;
      }

      setIsConnecting(true);

      // If connected to a different node, disconnect first
      if (connectedNodeAddress) {
        console.log('🔄 Disconnecting from previous node before connecting to new one...');
        const currentNode = nodes.find(n => n.address === connectedNodeAddress);
        if (currentNode) {
          await vpnConnectionService.deletePeer(currentNode.ipAddress, account);
        }
        setConnectedNodeAddress(null);
        // Small delay to ensure clean disconnection
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Find the node we want to connect to
      const node = nodes.find(n => n.address === nodeAddress);
      if (!node) {
        throw new Error('Node not found');
      }

      // Get VPN configuration from the node
      console.log('🔄 Getting VPN configuration...');
      const vpnConfig = await vpnConnectionService.connectToNode(nodeAddress, node.ipAddress, account);
      
      // The configuration is now automatically sent to the tray app
      setConnectedNodeAddress(nodeAddress);
      setSelectedNode(nodeAddress);
      
    } catch (error: any) {
      console.error('Connection error:', error);
      setConnectionError(error.message);
      setConnectedNodeAddress(null);
      setSelectedNode(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setConnectionError(null);

      // Check if account exists
      if (!account) {
        throw new Error('Please connect your wallet first');
      }

      if (!connectedNodeAddress) {
        console.log('Not connected to any node');
        return;
      }

      // Find the current node
      const node = nodes.find(n => n.address === connectedNodeAddress);
      if (!node) {
        throw new Error('Connected node not found');
      }

      // Delete the peer from the VPN node
      await vpnConnectionService.deletePeer(node.ipAddress, account);
      
      setConnectedNodeAddress(null);
      setSelectedNode(null);
      
    } catch (error: any) {
      console.error('Disconnect error:', error);
      setConnectionError(error.message);
    }
  };

  const handleRegisterNode = async () => {
    if (!account || !contract) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Check subscription first, before any validation
      const hasSubscription = await checkSubscription(account);
      if (!hasSubscription) {
        // Save the registration data for after subscription
        setRegistrationData({
          nodeAddress: newNodeAddress,
          nodeIP: newNodeIP,
          nodeFriendlyName: newNodeFriendlyName,
          nodeCountry: newNodeCountry
        });
        setPendingRegistration(true);
        setRegisterDialog(false);
        setShowSubscriptionDialog(true);
        return;
      }

      // Validate node address format
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

      // Check if the address is a valid Ethereum address with checksum
      try {
        const validAddress = ethers.getAddress(newNodeAddress);
        if (validAddress.toLowerCase() !== newNodeAddress.toLowerCase()) {
          setError('Invalid Ethereum address checksum. Please verify the address.');
          return;
        }
      } catch (err) {
        setError('Invalid Ethereum address format. Please provide a valid address.');
        return;
      }

      await registerNodeWithValidation();
    } catch (err: any) {
      console.error('Error registering node:', err);
      if (err.message.includes('already registered')) {
        setError('This node address is already registered in the blockchain.');
      } else if (err.message.includes('invalid address')) {
        setError('The provided node address is not a valid Ethereum address.');
      } else if (err.message.includes('invalid IP')) {
        setError('The provided IP address is invalid or not properly formatted.');
      } else {
        setError('Failed to register node. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  const registerNodeWithValidation = async () => {
    try {
      // Register node in backend
      try {
        await nodeService.registerNode(
          newNodeAddress,
          newNodeIP,
          account!,
          newNodeFriendlyName,
          newNodeCountry
        );
      } catch (err: any) {
        if (err.message.includes('already registered')) {
          throw new Error('This node address is already registered. Please use a different address.');
        } else if (err.message.includes('invalid IP')) {
          throw new Error('The provided IP address is invalid or already in use.');
        } else {
          throw new Error(err.message || 'Failed to register node in backend');
        }
      }

      // Register in smart contract
      const tx = await contract!.registerNode(newNodeAddress, newNodeIP) as TransactionResponse;
      await tx.wait(); // Wait for transaction confirmation

      setSuccess('Node registered successfully! Waiting for admin approval.');
      setRegisterDialog(false);
      setNewNodeAddress('');
      setNewNodeIP('');
      setNewNodeFriendlyName('');
      setNewNodeCountry('');
      
      // Refresh nodes list
      await fetchNodes();
    } catch (err: any) {
      throw err; // Re-throw to be caught by the parent handler
    }
  };

  // Handle subscription completion
  const handleSubscribed = async () => {
    setShowSubscriptionDialog(false);
    
    // If there was a pending node connection, try to connect now
    if (pendingNodeConnection) {
      try {
        await handleConnect(pendingNodeConnection);
        setPendingNodeConnection(null);
      } catch (err: any) {
        console.error('Error connecting to node after subscription:', err);
        setError('Failed to connect to node after subscription');
      }
      return;
    }
    
    // Handle node registration if that was pending
    if (pendingRegistration && registrationData) {
      // Restore the registration data
      setNewNodeAddress(registrationData.nodeAddress);
      setNewNodeIP(registrationData.nodeIP);
      setNewNodeFriendlyName(registrationData.nodeFriendlyName);
      setNewNodeCountry(registrationData.nodeCountry);
      
      // Reset the pending state
      setPendingRegistration(false);
      setRegistrationData(null);
      
      // Reopen the register dialog and attempt registration
      setRegisterDialog(true);
      try {
        await registerNodeWithValidation();
      } catch (err: any) {
        console.error('Error registering node after subscription:', err);
        setError(err.message || 'Failed to register node after subscription.');
      }
    }
  };

  if (!isInitialized) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="60vh"
        flexDirection="column"
        gap={2}
        sx={{ position: 'relative', zIndex: 2 }}
      >
        <CircularProgress 
          size={60} 
          sx={{
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            }
          }}
        />
        <Typography 
          variant="h6" 
          color="text.secondary"
        >
          Initializing connection...
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(13, 13, 13, 0.95) 0%, rgba(13, 13, 13, 0.9) 100%)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 50% 0%, rgba(156, 39, 176, 0.1) 0%, rgba(124, 77, 255, 0.1) 25%, rgba(33, 150, 243, 0.1) 50%, rgba(13, 13, 13, 0) 70%)',
            animation: 'pulse 8s ease-in-out infinite',
            zIndex: 0
          },
          zIndex: -1
        }}
      />
      
      {/* Error Snackbar */}
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

      <Box 
        sx={{ 
          minHeight: '100vh',
          width: '100%',
          position: 'relative',
          pt: '70px',
          zIndex: 1
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 2 }}>
          {/* Loading Overlay */}
          <Modal
            open={loading}
            aria-labelledby="loading-modal"
            aria-describedby="loading-modal-description"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            BackdropProps={{
              sx: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              }
            }}
          >
            <Stack spacing={2} alignItems="center">
              <CircularProgress 
                size={60}
                sx={{
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                    animation: 'progress 1.5s ease-in-out infinite !important',
                  }
                }}
              />
              <Typography 
                id="loading-modal-description"
                variant="h6" 
                color="common.white"
                sx={{
                  animation: 'fadeInOut 2s ease-in-out infinite',
                  '@keyframes fadeInOut': {
                    '0%, 100%': { opacity: 0.6 },
                    '50%': { opacity: 1 }
                  }
                }}
              >
                Loading Available Nodes...
              </Typography>
            </Stack>
          </Modal>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">
              Available Nodes
            </Typography>
            {!isAdmin && !isSuperAdmin && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setRegisterDialog(true)}
              >
                Register New Node
              </Button>
            )}
          </Box>
          
          {nodes.length === 0 ? (
            <Paper 
              sx={{ 
                p: 4, 
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <Stack spacing={2} alignItems="center">
                <Typography variant="h6" color="text.secondary">
                  No Active VPN Nodes
                </Typography>
                <Typography color="text.secondary">
                  There are currently no active VPN nodes in the network. Please check back later.
                </Typography>
              </Stack>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {nodes.map((node, index) => (
                <Grid item xs={12} sm={6} md={4} key={node.address}>
                  <NodeCard node={node} onConnect={handleConnect} index={index} />
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
        
        {/* Rest of the components */}
        <SubscriptionDialog
          open={showSubscriptionDialog}
          onClose={() => {
            setShowSubscriptionDialog(false);
            setPendingNodeConnection(null);
          }}
          onSubscribed={handleSubscribed}
        />
        <ScrollTop />
      </Box>
      
      {/* Register Node Dialog */}
      <Dialog 
        open={registerDialog} 
        onClose={() => setRegisterDialog(false)}
        keepMounted={false}
      >
        <DialogTitle>Register New Node</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2, minWidth: 300 }}>
            <TextField
              label="Node Address"
              fullWidth
              value={newNodeAddress}
              onChange={(e) => setNewNodeAddress(e.target.value)}
              placeholder="0x..."
              helperText="Ethereum address of the node"
            />
            <TextField
              label="IP Address"
              fullWidth
              value={newNodeIP}
              onChange={(e) => setNewNodeIP(e.target.value)}
              placeholder="xxx.xxx.xxx.xxx"
              helperText="IP address of the node"
            />
            <TextField
              label="Friendly Name"
              fullWidth
              value={newNodeFriendlyName}
              onChange={(e) => setNewNodeFriendlyName(e.target.value)}
              placeholder="e.g., Fast US Server"
              helperText="A user-friendly name for your VPN node"
            />
            <TextField
              label="Country"
              fullWidth
              value={newNodeCountry}
              onChange={(e) => setNewNodeCountry(e.target.value)}
              placeholder="e.g., United States"
              helperText="Country where the VPN server is located"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleRegisterNode} 
            variant="contained"
            disabled={!newNodeAddress || !newNodeIP || !newNodeFriendlyName || !newNodeCountry}
          >
            Submit for Approval
          </Button>
        </DialogActions>
      </Dialog>
      {qrCode && (
        <div className="mt-4">
          <h3>Scan QR Code to connect on mobile:</h3>
          <img src={`data:image/png;base64,${qrCode}`} alt="VPN Config QR Code" />
        </div>
      )}
      {vpnConfig && (
        <div className="mt-4">
          <button
            onClick={() => {
              if (vpnConfig && vpnConfig.config && vpnConfig.nodeAddress) {
                wireGuardService.downloadConfig(vpnConfig);
              }
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Download WireGuard Config
          </button>
        </div>
      )}

      {/* WireGuard Installation Dialog */}
      <Dialog 
        open={showInstallDialog} 
        onClose={() => setShowInstallDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>WireGuard Installation Required</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <Typography>
              To use the VPN service, you need to install the WireGuard client on your device.
            </Typography>
            
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Installation Steps:
              </Typography>
              {installInstructions?.instructions.map((instruction, index) => (
                <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                  {instruction}
                </Typography>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInstallDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (installInstructions?.downloadUrl) {
                window.open(installInstructions.downloadUrl, '_blank');
              }
            }}
            startIcon={<DownloadIcon />}
          >
            Download WireGuard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};