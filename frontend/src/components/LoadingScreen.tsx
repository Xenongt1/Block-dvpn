import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export const LoadingScreen: React.FC = () => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" color="textSecondary">
        Initializing...
      </Typography>
    </Box>
  );
}; 