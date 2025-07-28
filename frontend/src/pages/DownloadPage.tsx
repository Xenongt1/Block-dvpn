import React, { useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';

export const DownloadPage: React.FC = () => {
  const platform = useMemo(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) return 'windows';
    if (userAgent.includes('mac')) return 'mac';
    if (userAgent.includes('linux')) return 'linux';
    return 'unknown';
  }, []);

  const getDownloadUrl = () => {
    switch (platform) {
      case 'windows':
        return 'https://github.com/yourusername/vpn-app/releases/latest/download/vpn-app-setup.exe';
      case 'mac':
        return 'https://github.com/yourusername/vpn-app/releases/latest/download/vpn-app.dmg';
      case 'linux':
        return 'https://github.com/yourusername/vpn-app/releases/latest/download/vpn-app.AppImage';
      default:
        return '#';
    }
  };

  const getDownloadInstructions = () => {
    switch (platform) {
      case 'windows':
        return [
          'Download the installer',
          'Run the .exe file',
          'Follow the installation wizard',
          'Launch the VPN app'
        ];
      case 'mac':
        return [
          'Download the .dmg file',
          'Open the disk image',
          'Drag the app to Applications',
          'Launch from Applications'
        ];
      case 'linux':
        return [
          'Download the AppImage',
          'Make it executable (chmod +x)',
          'Double-click to run',
          'Consider creating a desktop shortcut'
        ];
      default:
        return ['Platform not supported'];
    }
  };

  const handleDownload = () => {
    const downloadUrl = getDownloadUrl();
    if (downloadUrl !== '#') {
      window.open(downloadUrl, '_blank');
    }
  };

  const features = [
    {
      icon: <SecurityIcon color="primary" />,
      title: 'Secure Connection',
      description: 'Automatic WireGuard tunnel activation with enterprise-grade security'
    },
    {
      icon: <SpeedIcon color="primary" />,
      title: 'Seamless Experience',
      description: 'One-click VPN connection without manual configuration'
    },
    {
      icon: <DownloadIcon color="primary" />,
      title: 'Easy Management',
      description: 'Simple interface to connect, disconnect, and manage your VPN'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Download VPN Desktop App
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Get the best VPN experience with our desktop application
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Features */}
        <Grid item xs={12} md={8}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Why Use Our Desktop App?
          </Typography>
          
          <Grid container spacing={3}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Card sx={{ height: '100%', p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {feature.icon}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {feature.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Download Section */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Download for {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </Typography>
            
            {platform !== 'unknown' ? (
              <Chip
                label={`Download VPN App`}
                color="primary"
                icon={<DownloadIcon />}
                onClick={handleDownload}
                sx={{ 
                  fontSize: '1.2rem', 
                  padding: '16px 24px',
                  cursor: 'pointer',
                  mb: 2,
                  '&:hover': {
                    backgroundColor: 'primary.dark'
                  }
                }}
              />
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Your platform is not supported
              </Alert>
            )}

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Compatible with {platform.charAt(0).toUpperCase() + platform.slice(1)} systems
              </Typography>
            </Alert>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Installation Instructions
            </Typography>
            
            <List dense>
              {getDownloadInstructions().map((instruction: string, index: number) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={instruction} />
                </ListItem>
              ))}
            </List>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          System Requirements
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {platform === 'windows' && 'Windows 10 or later (64-bit)'}
          {platform === 'mac' && 'macOS 10.15 or later'}
          {platform === 'linux' && 'Ubuntu 18.04+, Fedora, or compatible Linux distribution'}
          {platform === 'unknown' && 'Platform not supported'}
        </Typography>
      </Box>
    </Container>
  );
}; 