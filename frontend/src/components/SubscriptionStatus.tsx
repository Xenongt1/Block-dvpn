import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useWeb3 } from '../context/Web3Context';
import { SubscriptionServiceFactory, ISubscriptionService } from '../services/SubscriptionServiceFactory';
import { ConnectButton } from './ConnectButton';
import { ethers } from 'ethers';

export const SubscriptionStatus: React.FC = () => {
  const { account, isConnected, connectWallet, subscriptionContract, isAdmin, isSuperAdmin, provider, signer } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [subscriptionFee, setSubscriptionFee] = useState<string>('0');
  const [subscriptionService, setSubscriptionService] = useState<ISubscriptionService | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Initialize subscription service
  useEffect(() => {
    const initService = async () => {
      try {
        // Only initialize if not already initialized
        if (!subscriptionService) {
          console.log('[Debug] Initializing subscription service...');
          if (!provider || !signer) return;
          const service = await SubscriptionServiceFactory.getInstance(provider, signer as ethers.JsonRpcSigner);
          console.log('[Debug] Subscription service initialized:', !!service);
          setSubscriptionService(service);
        }
      } catch (err) {
        console.error('[Debug] Error initializing service:', err);
        setError('Failed to initialize service');
      }
    };

    initService();
  }, [subscriptionService]);

  // Only check subscription status when wallet is connected and user is not admin
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isConnected || !account || !subscriptionService) {
        console.log('[Debug] Missing requirements:', {
          isConnected,
          hasAccount: !!account,
          hasService: !!subscriptionService
        });
        return;
      }

      // Skip subscription check for admins
      if (isAdmin || isSuperAdmin) {
        setHasSubscription(true);
        setRemainingTime(Number.MAX_SAFE_INTEGER); // Set to maximum for unlimited access
        return;
      }

      setLoading(true);
      try {
        console.log('[Debug] Checking subscription for account:', account);
        
        const hasActiveSubscription = await subscriptionService.checkSubscription(account);
        console.log('[Debug] Has active subscription:', hasActiveSubscription);
        setHasSubscription(hasActiveSubscription);
        
        let remainingTimeValue = 0;
        if (hasActiveSubscription) {
          remainingTimeValue = await subscriptionService.getRemainingTime(account);
          console.log('[Debug] Remaining time:', remainingTimeValue);
          setRemainingTime(remainingTimeValue);
        }

        // Gather debug info
        const debug = {
          account,
          hasActiveSubscription,
          remainingTime: remainingTimeValue,
          serviceInitialized: !!subscriptionService,
          isAdmin,
          isSuperAdmin
        };
        console.log('[Debug] Full subscription state:', debug);
        setDebugInfo(debug);

      } catch (err) {
        console.error('[Debug] Error checking subscription:', err);
        setError('Failed to check subscription status');
      } finally {
        setLoading(false);
      }
    };

    if (isConnected && account) {
      checkSubscription();
    }
  }, [isConnected, account, subscriptionService, isAdmin, isSuperAdmin]);

  const handleSubscribe = async () => {
    if (!subscriptionService || !account) return;
    
    try {
      setError(null);
      setLoading(true);
      console.log('[Debug] Starting subscription process...');
      
      // Get subscription fee first to show user
      const fee = await subscriptionService.getSubscriptionFee();
      setSubscriptionFee(fee.toString());
      
      // Attempt to subscribe
      await subscriptionService.subscribe();
      console.log('[Debug] Subscription successful');
      
      // Refresh status after subscribing
      const hasActiveSubscription = await subscriptionService.checkSubscription(account);
      setHasSubscription(hasActiveSubscription);
      
      if (hasActiveSubscription) {
        const remaining = await subscriptionService.getRemainingTime(account);
        setRemainingTime(remaining);
      }
    } catch (err: any) {
      console.error('[Debug] Subscription error:', err);
      setError(err.message || 'Failed to subscribe. Please ensure you have enough Sepolia ETH.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscriptionService || !account) return;
    
    try {
      setError(null);
      setLoading(true);
      await subscriptionService.cancelSubscription();
      setHasSubscription(false);
      setRemainingTime(0);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const formatRemainingTime = (seconds: number): string => {
    if (isAdmin || isSuperAdmin) return 'Unlimited (Admin)';
    if (seconds === 0) return 'Inactive - No Subscription';
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (!isConnected) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" gutterBottom>
          Connect your wallet to view subscription status
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={connectWallet}
        >
          Connect Wallet
        </Button>
      </Box>
    );
  }

  if (loading) {
    console.log('[Debug] Loading subscription status...');
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  console.log('[Debug] Rendering subscription status:', {
    isAdmin,
    isSuperAdmin,
    hasSubscription,
    remainingTime,
    subscriptionFee,
    debugInfo
  });

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        VPN Subscription Status
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Status: {isAdmin || isSuperAdmin ? (
            <Chip 
              label="Active (Admin Access)" 
              color="success" 
              sx={{ 
                background: 'linear-gradient(45deg, #2196f3 30%, #21CBF3 90%)',
                ml: 1 
              }} 
            />
          ) : (
            <Chip 
              label={hasSubscription ? "Active" : "Inactive - No Active Subscription"} 
              color={hasSubscription ? "success" : "error"}
              sx={{ ml: 1 }} 
            />
          )}
        </Typography>
        
        {(isAdmin || isSuperAdmin) ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            As an admin, you have unlimited access to all VPN features. No subscription is required.
          </Alert>
        ) : (
          <>
            <Typography variant="body1">
              Time Remaining: {formatRemainingTime(remainingTime)}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Subscription Fee: {subscriptionFee} ETH
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Make sure you have enough Sepolia ETH for the subscription fee and gas costs.
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              {!hasSubscription ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubscribe}
                  disabled={loading}
                  startIcon={loading && <CircularProgress size={20} color="inherit" />}
                >
                  {loading ? 'Processing...' : 'Subscribe'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleCancel}
                  disabled={loading}
                  startIcon={loading && <CircularProgress size={20} color="inherit" />}
                >
                  {loading ? 'Processing...' : 'Cancel Subscription'}
                </Button>
              )}
            </Box>
          </>
        )}
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Connect Button with Countdown */}
      <ConnectButton hasSubscription={hasSubscription || isAdmin || isSuperAdmin} />

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Debug Information:</Typography>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </Box>
      )}
    </Paper>
  );
};

export default SubscriptionStatus; 