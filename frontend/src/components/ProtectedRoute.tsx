import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isConnected, isLoading, isAdmin, isSuperAdmin } = useWeb3();
  const location = useLocation();

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

  // Allow access if user is admin or super admin
  if (isAdmin || isSuperAdmin) {
    return <>{children}</>;
  }

  if (!isConnected) {
    // Redirect to the landing page while saving the attempted URL
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}; 