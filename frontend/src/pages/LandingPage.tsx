import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Stack,
  Fade,
  Grow,
  useTheme,
  useMediaQuery,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import DevicesIcon from '@mui/icons-material/Devices';
import CloudIcon from '@mui/icons-material/Cloud';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const features = [
  {
    icon: <SpeedIcon fontSize="large" />,
    title: 'Lightning Fast',
    description: 'Experience blazing fast speeds with our decentralized network',
    color: '#9c27b0'
  },
  {
    icon: <SecurityIcon fontSize="large" />,
    title: 'Ultra Secure',
    description: 'End-to-end encryption with blockchain-powered security',
    color: '#7c4dff'
  },
  {
    icon: <StorageIcon fontSize="large" />,
    title: 'Decentralized',
    description: 'No central authority, complete privacy and autonomy',
    color: '#2196f3'
  }
];

const additionalFeatures = [
  {
    icon: <PublicIcon />,
    title: 'Global Network',
    description: 'Access nodes worldwide',
    color: '#9c27b0'
  },
  {
    icon: <LockIcon />,
    title: 'No Logs Policy',
    description: 'Your privacy guaranteed',
    color: '#7c4dff'
  },
  {
    icon: <DevicesIcon />,
    title: 'Multi-Device',
    description: 'Connect all your devices',
    color: '#2196f3'
  },
  {
    icon: <CloudIcon />,
    title: 'Smart Routing',
    description: 'Optimal path selection',
    color: '#00bcd4'
  }
];

const FeatureCard = ({ icon, title, description, color, index }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  index: number;
}) => (
  <Grow in style={{ transformOrigin: '0 0 0', transitionDelay: `${index * 150}ms` }}>
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          transform: 'translateY(-5px)',
          '& .icon-wrapper': {
            transform: 'scale(1.1)',
          }
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, ${color}, transparent)`,
          opacity: 0.5
        }
      }}
    >
      <Stack spacing={2} alignItems="flex-start">
        <Box 
          className="icon-wrapper"
          sx={{ 
            color: color,
            transition: 'transform 0.3s ease',
            p: 1,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.03)'
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
          {description}
        </Typography>
      </Stack>
    </Paper>
  </Grow>
);

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { connectWallet, isConnected } = useWeb3();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleGetStarted = async () => {
    if (!isConnected) {
      await connectWallet();
    }
    navigate('/nodes');
  };

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background Gradient */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(13, 13, 13, 0.95) 0%, rgba(13, 13, 13, 0.9) 100%)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 50% 0%, rgba(156, 39, 176, 0.15) 0%, rgba(124, 77, 255, 0.15) 25%, rgba(33, 150, 243, 0.15) 50%, rgba(13, 13, 13, 0) 70%)',
            animation: 'pulse 8s ease-in-out infinite',
            zIndex: 0
          },
          zIndex: -1
        }}
      />

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: { xs: 8, md: 12 }, pb: 6 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Fade in timeout={1000}>
              <Stack spacing={4}>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 800,
                    background: 'linear-gradient(45deg, #9c27b0, #7c4dff, #2196f3)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 2,
                    fontSize: { xs: '2.5rem', md: '3.75rem' }
                  }}
                >
                  Decentralized VPN
                </Typography>
                <Typography 
                  variant="h5" 
                  color="text.secondary"
                  sx={{ maxWidth: 500 }}
                >
                  Experience the next generation of VPN technology. Secure, private, and truly decentralized.
                </Typography>
                <Box>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGetStarted}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      py: 2,
                      px: 4,
                      borderRadius: 3,
                      textTransform: 'none',
                      fontSize: '1.1rem',
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
                    Get Started
                  </Button>
                </Box>
              </Stack>
            </Fade>
          </Grid>
          <Grid item xs={12} md={6}>
            {/* Add hero illustration or animation here */}
          </Grid>
        </Grid>
      </Container>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h3"
          align="center"
          sx={{
            mb: 6,
            background: 'linear-gradient(45deg, #9c27b0, #7c4dff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}
        >
          Why Choose dVPN?
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={feature.title}>
              <FeatureCard {...feature} index={index} />
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Additional Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h4"
          align="center"
          sx={{
            mb: 6,
            color: 'text.primary',
            fontWeight: 'bold'
          }}
        >
          Advanced Features
        </Typography>
        <Grid container spacing={3}>
          {additionalFeatures.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={feature.title}>
              <FeatureCard {...feature} index={index} />
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Container maxWidth="md" sx={{ py: 12 }}>
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(124, 77, 255, 0.1) 50%, rgba(33, 150, 243, 0.1) 100%)',
            backdropFilter: 'blur(10px)',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <Typography variant="h4" gutterBottom>
            Ready to Get Started?
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
            Join the decentralized VPN revolution today and take control of your online privacy.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            endIcon={<ArrowForwardIcon />}
            sx={{
              py: 2,
              px: 6,
              borderRadius: 3,
              textTransform: 'none',
              fontSize: '1.1rem',
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
            Connect Wallet to Start
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}; 