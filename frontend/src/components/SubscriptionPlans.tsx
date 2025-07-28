import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ethers } from 'ethers';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface SubscriptionPlan {
  title: string;
  price: string;
  duration: string;
  features: PlanFeature[];
}

interface SubscriptionPlansProps {
  onSubscribe: () => void;
  subscriptionFee: string;
}

const features: PlanFeature[] = [
  { text: 'Access to all VPN nodes', included: true },
  { text: 'High speed and bandwidth', included: true },
  { text: 'Priority support', included: true },
  { text: 'Node registration capability', included: true },
  { text: '30-day subscription duration', included: true },
  { text: '24/7 network access', included: true },
];

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  onSubscribe,
  subscriptionFee,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        VPN Subscription Plan
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6 }}>
        Get unlimited access to our decentralized VPN network
      </Typography>

      <Grid container justifyContent="center">
        <Grid item xs={12} sm={8} md={6}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-8px)',
              },
              borderColor: 'primary.main',
              borderWidth: 2,
              borderStyle: 'solid',
              background: 'linear-gradient(45deg, rgba(156, 39, 176, 0.05), rgba(124, 77, 255, 0.05))',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'primary.main',
                color: 'white',
                px: 2,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              Best Value
            </Box>

            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h5" component="div" gutterBottom>
                Standard Plan
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
                <Typography variant="h3" component="span">
                  {subscriptionFee}
                </Typography>
                <Typography variant="subtitle1" component="span" sx={{ ml: 1 }}>
                  ETH / 30 days
                </Typography>
              </Box>

              <List>
                {features.map((feature, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <CheckCircleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={feature.text}
                      sx={{
                        color: 'text.primary',
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>

            <CardActions sx={{ p: 2, pt: 0 }}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={onSubscribe}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(45deg, #9c27b0, #7c4dff)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #7b1fa2, #6c3fd1)',
                  },
                }}
              >
                Subscribe Now
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 