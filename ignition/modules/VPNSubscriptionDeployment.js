const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("VPNSubscriptionDeployment", (m) => {
  // Deploy the VPNSubscription contract first
  const vpnSubscription = m.contract("VPNSubscription");

  // Deploy the VPNRegistry contract with VPNSubscription address
  const vpnRegistry = m.contract("VPNRegistry", [vpnSubscription]);

  // Return both contracts
  return { vpnRegistry, vpnSubscription };
}); 