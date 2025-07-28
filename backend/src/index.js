const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const winston = require('winston');
const vpnManager = require('./vpnManager');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Configure CORS for both Express and Socket.io
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001"],
  methods: ["GET", "POST"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

const port = process.env.PORT || 3006;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info('Client connected');

  // Send immediate acknowledgment
  socket.emit('connected', { status: 'ok' });

  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });

  // Handle VPN connection status updates
  vpnManager.on('status', (status) => {
    socket.emit('vpnStatus', status);
  });

  // Handle VPN connection errors
  vpnManager.on('error', (error) => {
    socket.emit('vpnError', error);
  });

  // Handle ping
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// VPN connection endpoint
app.post('/api/vpn/connect', async (req, res) => {
  try {
    const { nodeAddress, config } = req.body;
    logger.info('Connecting to VPN node:', { nodeAddress, config });

    // Check if already connected to this node
    if (vpnManager.isConnected(nodeAddress)) {
      return res.json({ success: true, message: 'Already connected to this node' });
    }

    // Validate configuration
    if (!config.serverAddress || !config.port || !config.protocol) {
      throw new Error('Invalid VPN configuration');
    }

    // Connect to VPN
    try {
      await vpnManager.connect(nodeAddress, config);
      logger.info('VPN connection established:', { nodeAddress });
      res.json({ success: true, message: 'VPN connection established' });
    } catch (vpnError) {
      logger.error('VPN connection error:', vpnError);
      
      // Check for specific error conditions
      if (vpnError.message.includes('Failed to setup WireGuard tunnel')) {
        res.status(500).json({
          success: false,
          message: 'Failed to setup VPN tunnel. Please ensure WireGuard is installed and you have administrator privileges.',
          details: vpnError.message
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: vpnError.message || 'Failed to establish VPN connection'
        });
      }
    }
  } catch (error) {
    logger.error('VPN endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to process VPN connection request'
    });
  }
});

// VPN disconnection endpoint
app.post('/api/vpn/disconnect', async (req, res) => {
  try {
    const { nodeAddress } = req.body;
    logger.info('Disconnecting from VPN node:', { nodeAddress });

    await vpnManager.disconnect(nodeAddress);
    logger.info('VPN disconnected successfully:', { nodeAddress });

    res.json({ success: true, message: 'VPN disconnected successfully' });
  } catch (error) {
    logger.error('VPN disconnection error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to disconnect VPN' 
    });
  }
});

// VPN status endpoint
app.get('/api/vpn/status/:nodeAddress', (req, res) => {
  try {
    const { nodeAddress } = req.params;
    const status = vpnManager.getStatus(nodeAddress);
    
    res.json({
      success: true,
      ...status,
      nodeAddress
    });
  } catch (error) {
    logger.error('VPN status check error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to check VPN status' 
    });
  }
});

// VPN key generation endpoint
app.post('/api/vpn/generate-keys', async (req, res) => {
  try {
    const { nodeAddress } = req.body;
    logger.info('Generating VPN keys for node:', { nodeAddress });

    // Generate new key pair
    const keyPair = await vpnManager.generateKeyPair();
    
    // Get the server's public key for this node
    const nodeConfig = await vpnManager.getNodeConfig(nodeAddress);

    res.json({
      success: true,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      serverPublicKey: nodeConfig.publicKey
    });
  } catch (error) {
    logger.error('VPN key generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate VPN keys'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// Start server with error handling
server.listen(port, () => {
  logger.info(`Backend server running on port ${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${port} is already in use. Please kill the process using that port or choose a different port.`);
    process.exit(1);
  } else {
    logger.error('Server error:', err);
    process.exit(1);
  }
}); 