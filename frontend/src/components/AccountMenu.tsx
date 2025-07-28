import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GppBadIcon from '@mui/icons-material/GppBad';
import { useWeb3 } from '../context/Web3Context';
import { SubscriptionServiceFactory } from '../services/SubscriptionServiceFactory';
import { SubscriptionDialog } from './SubscriptionDialog';
import { ethers } from 'ethers';

interface AccountMenuProps {
  onSignOut?: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({ onSignOut }) => {
  const { account, isConnected, connectWallet, provider, signer, isAdmin, isSuperAdmin } = useWeb3();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [subscriptionService, setSubscriptionService] = useState<any>(null);
  const [serviceInitialized, setServiceInitialized] = useState(false);

  const open = Boolean(anchorEl);

  // Initialize subscription service
  useEffect(() => {
    let mounted = true;

    const initService = async () => {
      if (!provider || !signer || !account) {
        console.log('[Debug] Missing dependencies:', { 
          hasProvider: !!provider, 
          hasSigner: !!signer, 
          hasAccount: !!account 
        });
        return;
      }

      try {
        console.log('[Debug] Initializing subscription service...');
        const service = await SubscriptionServiceFactory.getInstance(provider, signer as ethers.JsonRpcSigner);
        
        if (!mounted) return;

        await service.initialize();
        console.log('[Debug] Service initialized:', !!service);
        
        if (!mounted) return;
        
        setSubscriptionService(service);
        setServiceInitialized(true);

        // Check subscription status only if not an admin
        if (!isAdmin && !isSuperAdmin) {
          setLoading(true);
          try {
            console.log('[Debug] Checking subscription for account:', account);
            const hasActiveSubscription = await service.checkSubscription(account);
            if (!mounted) return;
            
            console.log('[Debug] Has active subscription:', hasActiveSubscription);
            setHasSubscription(hasActiveSubscription);
            
            if (hasActiveSubscription) {
              const time = await service.getRemainingTime(account);
              if (!mounted) return;
              
              console.log('[Debug] Remaining time:', time);
              setRemainingTime(time);
            }
          } catch (err) {
            console.error('[Debug] Error checking subscription:', err);
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        } else {
          // Set subscription as active for admins
          setHasSubscription(true);
          setLoading(false);
        }
      } catch (err) {
        console.error('[Debug] Error initializing service:', err);
        if (mounted) {
          setServiceInitialized(false);
        }
      }
    };

    if (isConnected && !serviceInitialized && provider && signer && account) {
      initService();
    }

    return () => {
      mounted = false;
    };
  }, [isConnected, provider, signer, account, isAdmin, isSuperAdmin]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleManageSubscription = () => {
    handleClose();
    setShowSubscriptionDialog(true);
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatRemainingTime = (seconds: number): string => {
    if (seconds === 0) return 'No active subscription';
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (!isConnected) {
    return (
      <Button
        variant="outlined"
        color="inherit"
        onClick={connectWallet}
        startIcon={<AccountCircleIcon />}
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: 'white',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <AccountCircleIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            backgroundColor: 'rgba(17, 25, 54, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            mt: 1.5,
            minWidth: 200,
            '& .MuiMenuItem-root': {
              color: 'white',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }
            }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem disabled>
          <ListItemText 
            primary={account ? formatAddress(account) : 'Loading...'}
            secondary="Connected Wallet"
          />
        </MenuItem>
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        <MenuItem disabled>
          <ListItemIcon>
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : hasSubscription || isAdmin || isSuperAdmin ? (
              <VerifiedUserIcon sx={{ color: '#4caf50' }} />
            ) : (
              <GppBadIcon sx={{ color: '#f44336' }} />
            )}
          </ListItemIcon>
          <ListItemText 
            primary="Subscription Status"
            secondary={loading ? 'Checking...' : (isAdmin || isSuperAdmin) ? 'Active' : (hasSubscription ? `Active - ${formatRemainingTime(remainingTime)}` : 'Inactive')}
          />
        </MenuItem>
        {!isAdmin && !isSuperAdmin && (
          <MenuItem onClick={handleManageSubscription}>
            <ListItemText primary="Manage Subscription" />
          </MenuItem>
        )}
      </Menu>
      <SubscriptionDialog
        open={showSubscriptionDialog}
        onClose={() => setShowSubscriptionDialog(false)}
        onSubscribed={async () => {
          setShowSubscriptionDialog(false);
          // Refresh subscription status
          if (account && subscriptionService && serviceInitialized && !isAdmin && !isSuperAdmin) {
            setLoading(true);
            try {
              const hasActiveSubscription = await subscriptionService.checkSubscription(account);
              setHasSubscription(hasActiveSubscription);
              if (hasActiveSubscription) {
                const time = await subscriptionService.getRemainingTime(account);
                setRemainingTime(time);
              }
            } catch (err) {
              console.error('Error refreshing subscription status:', err);
            } finally {
              setLoading(false);
            }
          }
        }}
      />
    </>
  );
}; 