const { Network, Alchemy } = require("alchemy-sdk");
require("dotenv").config();

async function main() {
  const settings = {
    apiKey: process.env.ALCHEMY_API_KEY || "3i2obdx2rJfDFSiyt9eQEk7To0WOAPSi",
    network: Network.ETH_SEPOLIA,
  };

  const alchemy = new Alchemy(settings);

  try {
    const latestBlock = await alchemy.core.getBlockNumber();
    console.log("Connected to Alchemy! Latest block:", latestBlock);
    return true;
  } catch (error) {
    console.error("Failed to connect to Alchemy:", error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} 