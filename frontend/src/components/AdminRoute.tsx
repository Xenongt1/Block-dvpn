import React from 'react';
import { Navigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { CircularProgress, Box } from '@mui/material';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isConnected, isLoading, isAdmin, isSuperAdmin } = useWeb3();

  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress 
          size={60}
          sx={{
            color: 'primary.main',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            }
          }}
        />
      </Box>
    );
  }

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  // Allow both regular admins and super admins to access the dashboard
  if (!isAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}; 