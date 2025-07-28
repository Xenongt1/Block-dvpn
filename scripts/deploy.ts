import { ethers, network } from "hardhat";
import { verify } from "./verify";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Network:", network.name);

  // Deploy VPNRegistry first
  console.log("\nDeploying VPNRegistry...");
  const VPNRegistry = await ethers.getContractFactory("VPNRegistry");
  const registry = await VPNRegistry.deploy();
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  console.log("VPNRegistry deployed to:", registryAddress);

  // Deploy VPNSubscription with the correct fee
  const subscriptionFee = ethers.parseEther("0.00001"); // 0.00001 ETH for 30 days
  console.log("\nDeploying VPNSubscription...");
  console.log("Subscription fee:", ethers.formatEther(subscriptionFee), "ETH");
  
  const VPNSubscription = await ethers.getContractFactory("VPNSubscription");
  const subscription = await VPNSubscription.deploy(subscriptionFee);
  await subscription.waitForDeployment();
  
  const subscriptionAddress = await subscription.getAddress();
  console.log("VPNSubscription deployed to:", subscriptionAddress);

  // Wait for block confirmations
  console.log("\nWaiting for block confirmations...");
  await registry.deploymentTransaction()?.wait(6);
  await subscription.deploymentTransaction()?.wait(6);
  console.log("Deployments confirmed");

  // Save the contract addresses
  const addresses = {
    VPNRegistry: registryAddress,
    VPNSubscription: subscriptionAddress
  };

  // Verify the contracts on Etherscan
  console.log("\nVerifying contracts on Etherscan...");
  try {
    await verify(registryAddress, []);
    console.log("VPNRegistry verified successfully");
    
    await verify(subscriptionAddress, [subscriptionFee]);
    console.log("VPNSubscription verified successfully");
  } catch (error) {
    console.log("Error verifying contracts:", error);
  }

  console.log("\nDeployment Summary");
  console.log("------------------");
  console.log("Network:", network.name);
  console.log("VPNRegistry:", registryAddress);
  console.log("VPNSubscription:", subscriptionAddress);
  console.log("Deployer:", deployer.address);
  console.log("Subscription Fee:", ethers.formatEther(subscriptionFee), "ETH");

  console.log("\nNext steps:");
  console.log("1. Update these addresses in frontend/src/config/contracts.ts:");
  console.log(`   SEPOLIA_VPN_REGISTRY = "${registryAddress}"`);
  console.log(`   SEPOLIA_VPN_SUBSCRIPTION = "${subscriptionAddress}"`);
  console.log("2. Test the contracts on Sepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 