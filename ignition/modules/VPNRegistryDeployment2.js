const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { Network, Alchemy } = require("alchemy-sdk");
require("dotenv").config();

module.exports = buildModule("VPNRegistryDeployment2", (m) => {
  // Setup Alchemy with environment variables
  const settings = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.ETH_SEPOLIA,
  };

  // Deploy the VPNRegistry contract
  console.log("Deploying VPNRegistry contract...");
  const vpnRegistry = m.contract("VPNRegistry", []);

  // Log deployment info
  console.log("\nDeployment Info:");
  console.log("Network:", settings.network);

  return { vpnRegistry };
}); 