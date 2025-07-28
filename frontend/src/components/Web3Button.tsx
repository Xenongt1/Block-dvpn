import React, { useState, useEffect } from 'react';
import Web3Service from '../services/Web3Service';
import { Button, CircularProgress } from '@mui/material';

export const Web3Button: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const state = await Web3Service.connect();
      setIsConnected(state.isConnected);
      setAccount(state.account);
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      setIsConnected(false);
      setAccount(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Web3Service.disconnect();
    setIsConnected(false);
    setAccount(null);
  };

  useEffect(() => {
    // Check if already connected
    if (Web3Service.isConnected()) {
      setIsConnected(true);
    }
  }, []);

  if (error) {
    return (
      <Button
        variant="contained"
        color="error"
        onClick={handleConnect}
        disabled={isConnecting}
      >
        {error}
      </Button>
    );
  }

  if (isConnecting) {
    return (
      <Button variant="contained" disabled>
        <CircularProgress size={24} color="inherit" />
      </Button>
    );
  }

  if (isConnected && account) {
    return (
      <Button variant="contained" onClick={handleDisconnect}>
        {`${account.slice(0, 6)}...${account.slice(-4)}`}
      </Button>
    );
  }

  return (
    <Button variant="contained" onClick={handleConnect} disabled={isConnecting}>
      Connect Wallet
    </Button>
  );
}; 