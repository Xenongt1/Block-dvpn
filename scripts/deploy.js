// Setup: npm install alchemy-sdk
const { Network, Alchemy } = require("alchemy-sdk");
const hre = require("hardhat");
require("dotenv").config();

// Alchemy configuration
const settings = {
  apiKey: process.env.ALCHEMY_API_KEY, // Replace with your Alchemy API Key from .env
  network: Network.ETH_SEPOLIA, // Using Sepolia testnet
};

const alchemy = new Alchemy(settings);

async function main() {
  console.log("Deploying contracts...");

  // Deploy VPNSubscription first
  const VPNSubscription = await hre.ethers.getContractFactory("VPNSubscription");
  const vpnSubscription = await VPNSubscription.deploy();
  await vpnSubscription.waitForDeployment();
  const vpnSubscriptionAddress = await vpnSubscription.getAddress();
  console.log("VPNSubscription deployed to:", vpnSubscriptionAddress);

  // Deploy VPNRegistry with VPNSubscription address
  const VPNRegistry = await hre.ethers.getContractFactory("VPNRegistry");
  const vpnRegistry = await VPNRegistry.deploy(vpnSubscriptionAddress);
  await vpnRegistry.waitForDeployment();
  const vpnRegistryAddress = await vpnRegistry.getAddress();
  console.log("VPNRegistry deployed to:", vpnRegistryAddress);

  console.log("\nDeployment complete! Contract addresses:");
  console.log("VPNSubscription:", vpnSubscriptionAddress);
  console.log("VPNRegistry:", vpnRegistryAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 