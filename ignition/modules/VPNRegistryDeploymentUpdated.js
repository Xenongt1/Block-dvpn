const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("VPNRegistryDeploymentUpdated", (m) => {
    // Use the existing VPNSubscription contract address
    const vpnSubscriptionAddress = "0x49BE162aE7234D47c932CDf04C63a66b0421B6F2";
    
    // Deploy VPNRegistry with the existing VPNSubscription address
    console.log("Deploying updated VPNRegistry contract...");
    console.log("Using VPNSubscription at:", vpnSubscriptionAddress);
    
    const vpnRegistry = m.contract("VPNRegistry", [vpnSubscriptionAddress]);

    return { vpnRegistry };
}); 