import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Container, Box } from '@mui/material';
import { Web3Provider } from './context/Web3Context';
import { VPNProvider } from './contexts/VPNContext';
import { theme } from './theme';
import { AppRoutes } from './routes';
import { Header } from './components/Header';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Web3Provider>
          <VPNProvider>
            <div id="root" data-inert="false">
              <Header />
              <Container maxWidth="lg">
                <Box sx={{ my: 4 }}>
                  <AppRoutes />
                </Box>
              </Container>
            </div>
          </VPNProvider>
        </Web3Provider>
      </Router>
    </ThemeProvider>
  );
};

export default App;