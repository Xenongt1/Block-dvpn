const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { Server } = require('socket.io');
const http = require('http');
const { NodeSSH } = require('node-ssh');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with proper CORS and transport options
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Configure Express CORS
app.use(cors({
  origin: "*",
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'dvpn.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    // Create pending_nodes table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS pending_nodes (
      address TEXT PRIMARY KEY,
      ip_address TEXT NOT NULL,
      owner TEXT NOT NULL,
      friendly_name TEXT NOT NULL,
      country TEXT NOT NULL,
      submission_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending'
    )`);
  }
});

// Enhanced WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send immediate acknowledgment
  socket.emit('connected', { status: 'ok' });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Get all pending nodes
app.get('/api/pending-nodes', (req, res) => {
  db.all('SELECT * FROM pending_nodes WHERE status = ?', ['pending'], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Submit a new node for approval
app.post('/api/nodes/register', (req, res) => {
  const { address, ipAddress, owner, friendlyName, country } = req.body;
  
  if (!friendlyName || !country) {
    res.status(400).json({ error: 'Friendly name and country are required' });
    return;
  }

  // First check if the node is already pending
  db.get('SELECT * FROM pending_nodes WHERE address = ?', [address], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (row) {
      // Node is already pending, update its details
      db.run(
        'UPDATE pending_nodes SET ip_address = ?, owner = ?, friendly_name = ?, country = ?, submission_time = CURRENT_TIMESTAMP, status = ? WHERE address = ?',
        [ipAddress, owner, friendlyName, country, 'pending', address],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const updatedNode = {
            address,
            ipAddress,
            owner,
            friendlyName: friendlyName,
            country,
            status: 'pending',
            submission_time: new Date().toISOString()
          };
          
          io.emit('newPendingNode', updatedNode);
          
          res.json({
            message: 'Node registration updated successfully',
            node: updatedNode
          });
        }
      );
    } else {
      // New node registration
      db.run(
        'INSERT INTO pending_nodes (address, ip_address, owner, friendly_name, country) VALUES (?, ?, ?, ?, ?)',
        [address, ipAddress, owner, friendlyName, country],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const newNode = {
            address,
            ipAddress,
            owner,
            friendlyName: friendlyName,
            country,
            status: 'pending',
            submission_time: new Date().toISOString()
          };
          
          io.emit('newPendingNode', newNode);
          
          res.json({
            message: 'Node registration submitted successfully',
            node: newNode
          });
        }
      );
    }
  });
});

// Update node status (approve/reject)
app.post('/api/nodes/:address/status', (req, res) => {
  const { address } = req.params;
  const { status } = req.body;
  
  db.run(
    'UPDATE pending_nodes SET status = ? WHERE address = ?',
    [status, address],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Notify all connected clients about the status update
      io.emit('nodeStatusUpdate', { address, status });
      
      res.json({
        message: `Node ${status} successfully`,
        address
      });
    }
  );
});

// Get node details
app.get('/api/nodes/:address', (req, res) => {
  const { address } = req.params;
  
  db.get(
    'SELECT friendly_name, country FROM pending_nodes WHERE address = ? AND status = ?',
    [address, 'approved'],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (row) {
        res.json({
          friendly_name: row.friendly_name,
          country: row.country
        });
      } else {
        res.json({
          friendly_name: 'Hold on there',
          country: 'Hold on there'
        });
      }
    }
  );
});

// Start the server
const PORT = process.env.PORT || 3006;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 