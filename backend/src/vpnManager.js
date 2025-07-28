const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const { spawn, execSync } = require('child_process');
const crypto = require('crypto');

// WireGuard paths
const isWindows = process.platform === 'win32';
const WG_PATH = isWindows
  ? 'C:\\Program Files\\WireGuard\\wg.exe'
  : '/usr/bin/wg';
const WG_QUICK_PATH = isWindows
  ? 'C:\\Program Files\\WireGuard\\wireguard.exe'
  : '/usr/bin/wg-quick';

class VPNManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.configPath = path.join(__dirname, '../vpn-configs');
    this.keysPath = path.join(__dirname, '../client-keys');
  }

  async generateKeyPair() {
    try {
      // Create keys directory if it doesn't exist
      await fs.mkdir(this.keysPath, { recursive: true });

      // Generate a unique identifier for this client
      const clientId = crypto.randomBytes(8).toString('hex');
      
      if (isWindows) {
        // Use WireGuard's built-in key generation
        const privateKey = execSync(`"${WG_PATH}" genkey`).toString().trim();
        const publicKey = execSync(`echo ${privateKey} | "${WG_PATH}" pubkey`).toString().trim();
        
        // Save the keys
        const keyFile = path.join(this.keysPath, `${clientId}.json`);
        await fs.writeFile(keyFile, JSON.stringify({
          clientId,
          privateKey,
          publicKey
        }));

        return { clientId, privateKey, publicKey };
      } else {
        // For non-Windows systems (fallback to a placeholder for now)
        throw new Error('Key generation not implemented for non-Windows systems');
      }
    } catch (error) {
      console.error('Failed to generate WireGuard keys:', error);
      throw new Error('Failed to generate WireGuard keys');
    }
  }

  async connect(nodeAddress, config) {
    try {
      console.log('VPNManager: Starting connection process...', { nodeAddress, config });
      
      // Check WireGuard installation
      if (!await this.checkWireGuardInstallation()) {
        throw new Error('WireGuard is not installed. Please install WireGuard from https://www.wireguard.com/install/');
      }

      // Generate new keys if not provided
      if (!config.privateKey) {
        const keys = await this.generateKeyPair();
        config.privateKey = keys.privateKey;
        console.log('Generated new client keys:', {
          clientId: keys.clientId,
          publicKey: keys.publicKey
        });
      }

      // Create config directory if it doesn't exist
      await fs.mkdir(this.configPath, { recursive: true });

      // Generate config file
      const configFile = path.join(this.configPath, `${nodeAddress}.conf`);
      await this.generateConfig(configFile, config);
      console.log('VPNManager: Config file generated at:', configFile);

      return await this.connectWireGuard(nodeAddress, configFile);
    } catch (error) {
      console.error('VPNManager: Connection error:', error);
      this.emit('error', { nodeAddress, message: error.message });
      throw error;
    }
  }

  async checkWireGuardInstallation() {
    try {
      // Check if WireGuard executable exists
      const wireguardExists = await fs.access(WG_PATH)
        .then(() => true)
        .catch(() => false);

      const wireguardQuickExists = await fs.access(WG_QUICK_PATH)
        .then(() => true)
        .catch(() => false);

      if (!wireguardExists || !wireguardQuickExists) {
        console.error('VPNManager: WireGuard executables not found at:', {
          wg: WG_PATH,
          wgQuick: WG_QUICK_PATH
        });
        return false;
      }

      // Try to run a simple WireGuard command
      await new Promise((resolve, reject) => {
        const process = spawn(WG_PATH, ['--version'], {
          windowsHide: true
        });
        
        process.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('WireGuard command failed'));
          }
        });
      });

      return true;
    } catch (error) {
      console.error('VPNManager: WireGuard installation check failed:', error);
      return false;
    }
  }

  async connectWireGuard(nodeAddress, configFile) {
    console.log('VPNManager: Attempting WireGuard connection...');
    try {
      // First, ensure any existing tunnel is removed
      const tunnelName = path.basename(configFile, '.conf');
      try {
        if (isWindows) {
          await new Promise((resolve) => {
            const cleanup = spawn(WG_QUICK_PATH, ['/uninstalltunnelservice', tunnelName], {
              windowsHide: true
            });
            cleanup.on('close', resolve);
          });
        } else {
          await new Promise((resolve) => {
            const cleanup = spawn('wg-quick', ['down', tunnelName]);
            cleanup.on('close', resolve);
          });
        }
      } catch (error) {
        // Ignore cleanup errors
        console.log('VPNManager: Cleanup of existing tunnel failed (expected):', error.message);
      }

      // Now set up the new tunnel
      console.log('VPNManager: Setting up new tunnel...');
      const process = isWindows
        ? spawn(WG_QUICK_PATH, ['/installtunnelservice', configFile], {
            windowsHide: true
          })
        : spawn('wg-quick', ['up', configFile], {
            windowsHide: true
          });

      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        console.log(`[WireGuard][${nodeAddress}] ${data}`);
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`[WireGuard][${nodeAddress}] Error: ${data}`);
      });

      // Wait for the process to complete
      return await new Promise((resolve, reject) => {
        process.on('close', (code) => {
          if (code === 0) {
            // Store the connection
            this.connections.set(nodeAddress, {
              process: null,
              config: configFile,
              startTime: Date.now(),
              interface: tunnelName,
              protocol: 'wireguard'
            });
            
            this.emit('status', { type: 'connected', nodeAddress });
            resolve(true);
          } else {
            console.error('VPNManager: Tunnel setup failed:', errorOutput);
            reject(new Error(`Failed to setup WireGuard tunnel (exit code: ${code}). Please ensure you have administrator privileges.`));
          }
        });
      });
    } catch (error) {
      console.error('VPNManager: WireGuard connection error:', error);
      throw error;
    }
  }

  async disconnect(nodeAddress) {
    try {
      console.log('VPNManager: Starting disconnection process...', { nodeAddress });
      
      const connection = this.connections.get(nodeAddress);
      if (!connection) {
        console.log('VPNManager: No active connection found for node:', nodeAddress);
        return;
      }

      // Take down the tunnel
      const tunnelName = path.basename(connection.config, '.conf');
      console.log('VPNManager: Taking down tunnel:', tunnelName);
      
      await new Promise((resolve, reject) => {
        const process = isWindows
          ? spawn(WG_QUICK_PATH, ['/uninstalltunnelservice', tunnelName], {
              windowsHide: true
            })
          : spawn('wg-quick', ['down', tunnelName], {
              windowsHide: true
            });
        
        process.on('close', (code) => {
          if (code === 0 || code === 1) { // Accept code 1 as it might mean interface is already down
            resolve();
          } else {
            reject(new Error(`Failed to take down WireGuard tunnel (exit code: ${code})`));
          }
        });
      });

      // Clean up the config file
      try {
        await fs.unlink(connection.config);
      } catch (error) {
        console.error('VPNManager: Failed to delete config file:', error);
        // Continue even if file deletion fails
      }

      // Remove the connection from the map
      this.connections.delete(nodeAddress);
      this.emit('status', { type: 'disconnected', nodeAddress });
      console.log('VPNManager: Disconnection complete');
    } catch (error) {
      console.error('VPNManager: Disconnection error:', error);
      this.emit('error', { nodeAddress, message: error.message });
      throw error;
    }
  }

  isConnected(nodeAddress) {
    return this.connections.has(nodeAddress);
  }

  getStatus(nodeAddress) {
    const connection = this.connections.get(nodeAddress);
    if (!connection) {
      return {
        connected: false,
        uptime: 0
      };
    }

    return {
      connected: true,
      uptime: Math.floor((Date.now() - connection.startTime) / 1000),
      interface: connection.interface,
      protocol: connection.protocol
    };
  }

  async generateConfig(configFile, config) {
    console.log('VPNManager: Generating config file...', { configFile, config });
    
    // Create a unique interface name based on the config file name
    const interfaceName = path.basename(configFile, '.conf');
    
    const configContent = `[Interface]
PrivateKey = ${config.privateKey}
Address = 10.8.0.2/24
DNS = 1.1.1.1, 8.8.8.8
ListenPort = 51820

[Peer]
PublicKey = ${config.publicKey}
AllowedIPs = 0.0.0.0/0
Endpoint = ${config.serverAddress}:${config.port}
PersistentKeepalive = 25`;

    try {
      // Ensure the config directory exists
      await fs.mkdir(path.dirname(configFile), { recursive: true });
      
      // Write the config file
      await fs.writeFile(configFile, configContent);
      
      console.log('VPNManager: Config file generated successfully');
      return interfaceName;
    } catch (error) {
      console.error('VPNManager: Failed to generate config:', error);
      throw error;
    }
  }

  async getNodeConfig(nodeAddress) {
    try {
      // In a production environment, this would fetch the node's configuration
      // from a secure database or the blockchain
      const nodeConfigs = {
        // Example node configurations
        [nodeAddress]: {
          publicKey: '/ab9E7YXR1T9B1U9XjggF29VAkggIVsKXsiMXiT/BA=',
          endpoint: '35.197.230.164:1194'
        }
      };

      const config = nodeConfigs[nodeAddress];
      if (!config) {
        throw new Error('Node configuration not found');
      }

      return config;
    } catch (error) {
      console.error('Error getting node config:', error);
      throw error;
    }
  }
}

module.exports = new VPNManager(); 