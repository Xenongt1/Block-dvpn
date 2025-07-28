import React from 'react';
import { Button, CircularProgress, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';

interface ConnectButtonProps {
  hasSubscription: boolean;
}

export const ConnectButton: React.FC<ConnectButtonProps> = ({ hasSubscription }) => {
  const { isConnected, account, connectWallet, disconnectWallet, isLoading } = useWeb3();
  const [countdown, setCountdown] = React.useState<number>(10);
  const [isConnecting, setIsConnecting] = React.useState<boolean>(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnecting && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      navigate('/nodes');
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [countdown, isConnecting, navigate]);

  const handleConnect = async () => {
    setIsConnecting(true);
    await connectWallet();
  };

  if (!hasSubscription) {
    return null;
  }

  return (
    <Box sx={{ textAlign: 'center', mt: 2 }}>
      {!isConnected ? (
        <Button
          variant="contained"
          color="primary"
          onClick={handleConnect}
          size="large"
          disabled={isLoading}
          sx={{ 
            minWidth: 200,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
          }}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      ) : (
        <Button
          variant="outlined"
          color="secondary"
          onClick={disconnectWallet}
          size="large"
          sx={{ minWidth: 200 }}
        >
          Disconnect ({account ? account.slice(0, 6) + '...' + account.slice(-4) : ''})
        </Button>
      )}
      {isConnecting && !isConnected && (
        <Box sx={{ position: 'relative', display: 'inline-flex', mt: 2 }}>
          <CircularProgress
            variant="determinate"
            value={(countdown / 10) * 100}
            size={60}
            thickness={4}
            sx={{ color: '#2196F3' }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" component="div" color="text.secondary">
              {countdown}s
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}; 