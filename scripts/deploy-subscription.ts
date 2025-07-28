import { ethers } from "hardhat";
import { verify } from "./verify";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy VPNSubscription
  const initialFee = ethers.parseEther("0.01"); // 0.01 ETH for 30 days
  console.log("\nDeploying VPNSubscription...");
  console.log("Initial subscription fee:", ethers.formatEther(initialFee), "ETH");
  
  const VPNSubscription = await ethers.getContractFactory("VPNSubscription");
  const subscription = await VPNSubscription.deploy(initialFee);
  await subscription.waitForDeployment();
  
  const subscriptionAddress = await subscription.getAddress();
  console.log("VPNSubscription deployed to:", subscriptionAddress);

  // Wait for block confirmations
  console.log("\nWaiting for block confirmations...");
  await subscription.deploymentTransaction()?.wait(6);
  console.log("Deployment confirmed");

  // Verify the contract on Etherscan
  console.log("\nVerifying contract on Etherscan...");
  try {
    await verify(subscriptionAddress, [initialFee]);
    console.log("Contract verified successfully");
  } catch (error) {
    console.log("Error verifying contract:", error);
  }

  // Log deployment info
  console.log("\nDeployment Summary");
  console.log("------------------");
  console.log("VPNSubscription:", subscriptionAddress);
  console.log("Initial Fee:", ethers.formatEther(initialFee), "ETH");
  console.log("Deployer:", deployer.address);

  console.log("\nNext steps:");
  console.log("1. Update REACT_APP_SUBSCRIPTION_CONTRACT_ADDRESS in your frontend .env file with:", subscriptionAddress);
  console.log("2. Rebuild your frontend in production mode");
  console.log("3. Test the contract on Sepolia Etherscan");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 