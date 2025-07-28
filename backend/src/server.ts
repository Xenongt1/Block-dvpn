import express from 'express';
import cors from 'cors';
import http from 'http';
import vpnRoutes from './routes/vpn';
import { VPNStatusServer } from './websocket/vpnStatusServer';

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const vpnStatusServer = new VPNStatusServer(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/vpn', vpnRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  vpnStatusServer.stop();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
}); 