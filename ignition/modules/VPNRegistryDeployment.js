const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("VPNRegistryDeployment", async (m) => {
    // First deploy VPNSubscription
    console.log("Deploying VPNSubscription contract...");
    const vpnSubscription = await m.deploy("VPNSubscription");

    // Then deploy VPNRegistry with VPNSubscription address
    console.log("Deploying VPNRegistry contract...");
    const vpnRegistry = await m.deploy("VPNRegistry", [vpnSubscription.address]);

    return { vpnSubscription, vpnRegistry };
}); 