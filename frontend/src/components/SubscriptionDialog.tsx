import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Stack,
  Divider,
  Paper
} from '@mui/material';
import { useWeb3 } from '../context/Web3Context';
import { SubscriptionServiceFactory, ISubscriptionService } from '../services/SubscriptionServiceFactory';
import { SubscriptionPlans } from './SubscriptionPlans';
import { ethers, formatEther } from 'ethers';

interface SubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubscribed: () => void;
}

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
      id={`subscription-tabpanel-${index}`}
      aria-labelledby={`subscription-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const SubscriptionDialog: React.FC<SubscriptionDialogProps> = ({
  open,
  onClose,
  onSubscribed
}) => {
  const { account, isConnected, isAdmin, isSuperAdmin, provider, signer } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fee, setFee] = useState<string>('0');
  const [subscriptionService, setSubscriptionService] = useState<ISubscriptionService | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionEndTime, setSubscriptionEndTime] = useState<Date | null>(null);
  const [refundAvailable, setRefundAvailable] = useState(false);

  // Initialize service and check subscription status
  useEffect(() => {
    const initService = async () => {
      try {
        setError(null);
        setLoading(true);
        console.log('[Debug] Initializing subscription service in dialog...');
        if (!provider || !signer) return;
        const service = await SubscriptionServiceFactory.getInstance(provider, signer as ethers.JsonRpcSigner);
        setSubscriptionService(service);
        
        if (account) {
          console.log('[Debug] Checking subscription status for account:', account);
          
          // If user is admin, set subscription as active without checking contract
          if (isAdmin || isSuperAdmin) {
            console.log('[Debug] User is admin, setting unlimited subscription');
            setHasActiveSubscription(true);
            setSubscriptionEndTime(null); // No end time for admins
            setRefundAvailable(false); // Admins can't refund
            return; // Exit early for admins
          }
          
          // For non-admins, check subscription status
          const active = await service.checkSubscription(account);
          console.log('[Debug] Subscription active:', active);
          setHasActiveSubscription(active);
          
          if (active) {
            // Get remaining time
            const remainingTime = await service.getRemainingTime(account);
            const endTime = new Date(Date.now() + remainingTime * 1000);
            setSubscriptionEndTime(endTime);
            
            // Check if refund is available (within 24 hours of subscription start)
            const SUBSCRIPTION_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
            const timeSinceSubscription = SUBSCRIPTION_DURATION - remainingTime;
            setRefundAvailable(timeSinceSubscription <= 24 * 60 * 60); // Less than 24 hours since subscription
          }

          // Get subscription fee for non-admins
          const price = await service.getSubscriptionFee();
          console.log('[Debug] Subscription price:', price, 'ETH');
          // Convert bigint price to ETH string representation
          setFee(formatEther(price));
        }
      } catch (err) {
        console.error('[Debug] Error initializing service:', err);
        // Don't show error for admins since they don't need the service
        if (!isAdmin && !isSuperAdmin) {
          setError('Failed to initialize service. Please make sure your wallet is connected.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (open && isConnected) {
      initService();
    }
  }, [open, isConnected, account, isAdmin, isSuperAdmin, provider, signer]);

  const handleSubscribe = async () => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }

    if (!subscriptionService) {
      setError('Service not initialized. Please try refreshing the page.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Debug] Starting subscription process...');
      const success = await subscriptionService.subscribe();
      if (success) {
        console.log('[Debug] Subscription successful');
        setHasActiveSubscription(true);
        onSubscribed();
        onClose();
      } else {
        setError('Subscription failed. Please try again.');
      }
    } catch (error: any) {
      console.error('[Debug] Subscription error:', error);
      if (error.message.includes('Contracts not initialized')) {
        setError('Failed to initialize contracts. Please make sure your wallet is connected and try again.');
      } else if (error.message.includes('insufficient funds') || error.message.includes('Insufficient balance')) {
        setError('You do not have enough Sepolia ETH to complete the subscription. Please add more funds and try again.');
      } else if (error.message.includes('user rejected') || error.message.includes('ACTION_REJECTED')) {
        setError('Transaction was rejected. Please try again.');
      } else {
        setError(error.message || 'Failed to subscribe. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!account || !subscriptionService) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Debug] Attempting to cancel subscription and request refund...');
      const success = await subscriptionService.cancelSubscription();
      if (success) {
        console.log('[Debug] Successfully cancelled subscription');
        setHasActiveSubscription(false);
        setRefundAvailable(false);
        onClose();
      } else {
        setError('Failed to process refund. Please try again.');
      }
    } catch (error: any) {
      console.error('[Debug] Refund error:', error);
      if (error.message.includes('24-hour')) {
        setError('Cannot cancel: 24-hour cancellation period has expired');
      } else if (error.message.includes('No active subscription')) {
        setError('No active subscription found to cancel');
      } else if (error.message.includes('user rejected')) {
        setError('Transaction was rejected');
      } else {
        setError(error.message || 'Failed to process refund');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(17, 25, 54, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white'
        }
      }}
    >
      <DialogTitle>
        VPN Subscription
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : isAdmin || isSuperAdmin ? (
          <Stack spacing={2}>
            <Alert severity="info">
              As an admin, you have unlimited access to all VPN features without requiring a subscription.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Your admin status grants you automatic access to the VPN network. No subscription is needed.
            </Typography>
          </Stack>
        ) : hasActiveSubscription ? (
          <Stack spacing={2}>
            <Alert severity="success">
              You have an active subscription
              {subscriptionEndTime && ` until ${subscriptionEndTime.toLocaleDateString()}`}
            </Alert>
            {refundAvailable && (
              <>
                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                <Typography variant="body2" color="text.secondary">
                  You can request a refund if you've subscribed within the last 24 hours
                </Typography>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={handleRefund}
                  disabled={loading}
                >
                  Request Refund
                </Button>
              </>
            )}
          </Stack>
        ) : (
          <SubscriptionPlans
            onSubscribe={handleSubscribe}
            subscriptionFee={fee}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 