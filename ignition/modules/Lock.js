// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SimpleLock", (m) => {
    // Get the current timestamp
    const currentTimestamp = Math.floor(Date.now() / 1000);
    // Set unlock time to 1 hour from now
    const unlockTime = currentTimestamp + 3600; // 3600 seconds = 1 hour

    const lock = m.contract("Lock", [unlockTime], {
        value: "0.001 ether", // Optional: sending some ETH during deployment
    });

    return { lock };
});
