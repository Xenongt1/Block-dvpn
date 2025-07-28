const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("VPNSubscription", async (m) => {
    const vpnSubscription = await m.deploy("VPNSubscription");
    return { vpnSubscription };
}); 