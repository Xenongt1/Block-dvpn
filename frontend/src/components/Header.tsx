import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Divider,
  Paper
} from '@mui/material';
import { useWeb3 } from '../context/Web3Context';
import { useNavigate, useLocation } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import MenuIcon from '@mui/icons-material/Menu';
import { AccountMenu } from './AccountMenu';

export const Header: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const { 
    account, 
    contract,
    connectWallet, 
    disconnectWallet, 
    isConnected, 
    error,
    setError, 
    isLoading,
    connectedNode,
    isAdmin,
    isSuperAdmin
  } = useWeb3();
  const [confirmDialog, setConfirmDialog] = useState(false);
  const navigate = useNavigate();

  // Function to clear all MetaMask connection data
  const clearAllMetaMaskData = () => {
    // Clear Web3 connection caches
    localStorage.removeItem('walletconnect');
    localStorage.removeItem('WEB3_CONNECT_CACHED_PROVIDER');
    localStorage.removeItem('web3modal_cached_provider');
    localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
    
    // Clear any VPN related data
    localStorage.removeItem('recent_connections');
    localStorage.removeItem('favorite_nodes');
    localStorage.removeItem('performance_history');
    localStorage.removeItem('user_preferences');
    
    // Clear any other potential MetaMask related items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('metamask') || key?.includes('web3') || key?.includes('wallet')) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear session storage as well
    sessionStorage.clear();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleMenuAction = (action: () => void) => {
    handleMenuClose();
    action();
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      clearAllMetaMaskData();
      setConfirmDialog(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  };

  const renderAccountMenu = () => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 2,
      ml: 'auto'
    }}>
      {isConnected && account && (
        <>
          {/* Show admin button if user is either admin or super admin */}
          {(isAdmin || isSuperAdmin) && (
            <Tooltip title="Admin Dashboard">
              <Button
                color="inherit"
                onClick={() => navigate('/admin', { replace: true })}
                startIcon={<AdminPanelSettingsIcon />}
                sx={{ 
                  textTransform: 'none',
                  display: { xs: 'none', md: 'flex' }
                }}
              >
                Admin
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Connected wallet address">
            <Chip
              icon={<AccountBalanceWalletIcon />}
              label={`${account?.slice(0, 6)}...${account?.slice(-4)}`}
              sx={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
                display: { xs: 'none', sm: 'flex' }
              }}
            />
          </Tooltip>
          {connectedNode && (
            <Tooltip title="Connected VPN node">
              <Chip
                icon={<VpnKeyIcon />}
                label={`Node: ${connectedNode.slice(0, 6)}...${connectedNode.slice(-4)}`}
                sx={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  display: { xs: 'none', sm: 'flex' }
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="Sign out">
            <span>
              <Button 
                color="inherit" 
                onClick={() => setConfirmDialog(true)}
                disabled={isLoading}
                startIcon={<LogoutIcon />}
                sx={{ 
                  textTransform: 'none'
                }}
              >
                Sign Out
              </Button>
            </span>
          </Tooltip>
        </>
      )}
    </Box>
  );

  const renderMobileMenu = () => (
    <>
      {!isLandingPage && (
        <IconButton
          color="inherit"
          edge="end"
          onClick={handleMenuOpen}
          sx={{
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <MenuIcon />
        </IconButton>
      )}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 2,
            background: 'rgba(18, 18, 18, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: 200
          }
        }}
      >
        {isConnected && account ? (
          <>
            <MenuItem disabled sx={{ opacity: 0.7 }}>
              <ListItemIcon>
                <AccountBalanceWalletIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                {`${account?.slice(0, 6)}...${account?.slice(-4)}`}
              </ListItemText>
            </MenuItem>
            {connectedNode && (
              <MenuItem disabled sx={{ opacity: 0.7 }}>
                <ListItemIcon>
                  <VpnKeyIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>
                  {`Node: ${connectedNode.slice(0, 6)}...${connectedNode.slice(-4)}`}
                </ListItemText>
              </MenuItem>
            )}
            {/* Show admin menu item if user is either admin or super admin */}
            {(isAdmin || isSuperAdmin) && (
              <MenuItem onClick={() => handleMenuAction(() => navigate('/admin', { replace: true }))}>
                <ListItemIcon>
                  <AdminPanelSettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Admin Dashboard</ListItemText>
              </MenuItem>
            )}
            <Divider />
            <MenuItem onClick={() => handleMenuAction(() => setConfirmDialog(true))}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sign Out</ListItemText>
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </>
  );

  return (
    <>
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{
          background: 'rgba(17, 25, 54, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: '64px', sm: '70px' } }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              width: '100%',
              justifyContent: 'space-between'
            }}
          >
            <Typography 
              variant={isMobile ? 'subtitle1' : 'h6'}
              component="div" 
              sx={{ 
                cursor: 'pointer',
                fontWeight: 800,
                background: 'linear-gradient(45deg, #9c27b0, #7c4dff, #2196f3)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                position: 'relative',
                display: 'inline-block',
                px: { xs: 2, sm: 3 },
                py: 1,
                fontSize: {
                  xs: '1rem',
                  sm: '1.25rem',
                  md: '1.5rem'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '30px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transform: 'skew(-10deg)',
                  zIndex: -1
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: 10,
                  width: 6,
                  height: 6,
                  background: '#9c27b0',
                  borderRadius: '50%',
                  transform: 'translateY(-50%)',
                  boxShadow: '0 0 10px #9c27b0'
                }
              }}
              onClick={() => navigate('/', { replace: true })}
            >
              {isMobile ? 'dVPN' : 'Decentralized VPN'}
            </Typography>

            {/* Right Section */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              ml: 'auto'
            }}>
              {isConnected ? (
                <>
                  {/* Show admin button if user is either admin or super admin */}
                  {(isAdmin || isSuperAdmin) && (
                    <Button
                      color="inherit"
                      onClick={() => navigate('/admin')}
                      startIcon={<AdminPanelSettingsIcon />}
                      sx={{ 
                        textTransform: 'none',
                        display: { xs: 'none', md: 'flex' }
                      }}
                    >
                      Admin
                    </Button>
                  )}
                  {connectedNode && (
                    <Chip
                      icon={<VpnKeyIcon />}
                      label={`Node: ${connectedNode.slice(0, 6)}...${connectedNode.slice(-4)}`}
                      sx={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        display: { xs: 'none', sm: 'flex' }
                      }}
                    />
                  )}
                  <AccountMenu />
                  {/* Desktop Sign Out Button */}
                  <Button
                    color="inherit"
                    onClick={() => setConfirmDialog(true)}
                    startIcon={<LogoutIcon />}
                    sx={{ 
                      textTransform: 'none',
                      display: { xs: 'none', sm: 'flex' }
                    }}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  onClick={async () => {
                    try {
                      await connectWallet();
                    } catch (error) {
                      console.error('Connection error:', error);
                    }
                  }}
                  disabled={isLoading}
                  startIcon={<AccountBalanceWalletIcon />}
                  sx={{
                    textTransform: 'none',
                    background: 'linear-gradient(45deg, #9c27b0, #7c4dff)',
                    boxShadow: '0 4px 20px rgba(124, 77, 255, 0.2)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(124, 77, 255, 0.3)',
                      background: 'linear-gradient(45deg, #7c4dff, #2196f3)'
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                      Connecting...
                    </>
                  ) : (
                    'Connect Wallet'
                  )}
                </Button>
              )}
              {isMobile && renderMobileMenu()}
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(17, 25, 54, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            color: 'white'
          }
        }}
      >
        <DialogTitle>Sign Out</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to sign out? This will disconnect your wallet.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDisconnect} variant="contained" color="error">
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Snackbar */}
      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setError(null)} severity="error" variant="filled">
            {error}
          </Alert>
        </Snackbar>
      )}
    </>
  );
}; 