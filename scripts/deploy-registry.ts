import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Use the existing VPNSubscription contract address
  const vpnSubscriptionAddress = "0x49BE162aE7234D47c932CDf04C63a66b0421B6F2";
  console.log("Using VPNSubscription at:", vpnSubscriptionAddress);

  // Deploy VPNRegistry
  console.log("\nDeploying VPNRegistry...");
  const VPNRegistry = await ethers.getContractFactory("VPNRegistry");
  const registry = await VPNRegistry.deploy(vpnSubscriptionAddress);
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  console.log("VPNRegistry deployed to:", registryAddress);

  // Wait for block confirmations
  console.log("\nWaiting for block confirmations...");
  await registry.deploymentTransaction()?.wait(6);
  console.log("Deployment confirmed");

  // Log deployment info
  console.log("\nDeployment Summary");
  console.log("------------------");
  console.log("Network: Sepolia");
  console.log("VPNRegistry:", registryAddress);
  console.log("VPNSubscription:", vpnSubscriptionAddress);
  console.log("Deployer:", deployer.address);

  console.log("\nNext steps:");
  console.log("1. Update your frontend configuration with the new VPNRegistry address");
  console.log("2. Verify the contract on Etherscan");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 