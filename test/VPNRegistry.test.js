const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VPNRegistry", function () {
    let vpnRegistry;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    // Test node data
    const testNodeAddress = "0x1234567890123456789012345678901234567890";
    const testIpAddress = "192.168.1.1";

    beforeEach(async function () {
        // Get signers (accounts)
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        // Deploy the contract
        const VPNRegistry = await ethers.getContractFactory("VPNRegistry");
        vpnRegistry = await VPNRegistry.deploy();
        const address = await vpnRegistry.getAddress();
        
        // Get contract instance at deployed address
        vpnRegistry = await ethers.getContractAt("VPNRegistry", address);
    });

    describe("Deployment", function () {
        it("Should set the right admin", async function () {
            expect(await vpnRegistry.admin()).to.equal(owner.address);
        });
    });

    describe("Node Registration", function () {
        it("Should allow registering a new node", async function () {
            await vpnRegistry.connect(addr1).registerNode(testNodeAddress, testIpAddress);
            
            const nodeDetails = await vpnRegistry.getNodeDetails(testNodeAddress);
            expect(nodeDetails[0]).to.equal(testIpAddress); // IP address
            expect(nodeDetails[1]).to.equal(addr1.address); // owner
        });

        it("Should emit NodeRegistered event", async function () {
            await expect(vpnRegistry.connect(addr1).registerNode(testNodeAddress, testIpAddress))
                .to.emit(vpnRegistry, "NodeRegistered")
                .withArgs(testNodeAddress, testIpAddress, addr1.address);
        });

        it("Should not allow registering the same node twice", async function () {
            await vpnRegistry.connect(addr1).registerNode(testNodeAddress, testIpAddress);
            await expect(
                vpnRegistry.connect(addr1).registerNode(testNodeAddress, testIpAddress)
            ).to.be.revertedWith("Node already registered");
        });

        it("Should not allow empty IP address", async function () {
            await expect(
                vpnRegistry.connect(addr1).registerNode(testNodeAddress, "")
            ).to.be.revertedWith("IP address cannot be empty");
        });
    });

    describe("Node Approval", function () {
        beforeEach(async function () {
            await vpnRegistry.connect(addr1).registerNode(testNodeAddress, testIpAddress);
        });

        it("Should allow admin to approve node", async function () {
            await vpnRegistry.connect(owner).approveNode(testNodeAddress);
            const nodeDetails = await vpnRegistry.getNodeDetails(testNodeAddress);
            expect(nodeDetails[3]).to.be.true; // isApproved
            expect(nodeDetails[4]).to.be.true; // isActive
        });

        it("Should emit NodeApproved event", async function () {
            await expect(vpnRegistry.connect(owner).approveNode(testNodeAddress))
                .to.emit(vpnRegistry, "NodeApproved")
                .withArgs(testNodeAddress);
        });

        it("Should not allow non-admin to approve node", async function () {
            await expect(
                vpnRegistry.connect(addr1).approveNode(testNodeAddress)
            ).to.be.revertedWith("Only admin can perform this action");
        });

        it("Should not allow approving non-existent node", async function () {
            const nonExistentNode = "0x9876543210987654321098765432109876543210";
            await expect(
                vpnRegistry.connect(owner).approveNode(nonExistentNode)
            ).to.be.revertedWith("Node does not exist");
        });
    });

    describe("Node Deactivation", function () {
        beforeEach(async function () {
            await vpnRegistry.connect(addr1).registerNode(testNodeAddress, testIpAddress);
            await vpnRegistry.connect(owner).approveNode(testNodeAddress);
        });

        it("Should allow admin to deactivate node", async function () {
            await vpnRegistry.connect(owner).deactivateNode(testNodeAddress);
            const nodeDetails = await vpnRegistry.getNodeDetails(testNodeAddress);
            expect(nodeDetails[4]).to.be.false; // isActive
        });

        it("Should allow node owner to deactivate node", async function () {
            await vpnRegistry.connect(addr1).deactivateNode(testNodeAddress);
            const nodeDetails = await vpnRegistry.getNodeDetails(testNodeAddress);
            expect(nodeDetails[4]).to.be.false; // isActive
        });

        it("Should emit NodeDeactivated event", async function () {
            await expect(vpnRegistry.connect(owner).deactivateNode(testNodeAddress))
                .to.emit(vpnRegistry, "NodeDeactivated")
                .withArgs(testNodeAddress);
        });

        it("Should not allow non-owner/non-admin to deactivate node", async function () {
            await expect(
                vpnRegistry.connect(addr2).deactivateNode(testNodeAddress)
            ).to.be.revertedWith("Only admin or node owner can deactivate");
        });
    });

    describe("Node Reactivation", function () {
        beforeEach(async function () {
            await vpnRegistry.connect(addr1).registerNode(testNodeAddress, testIpAddress);
            await vpnRegistry.connect(owner).approveNode(testNodeAddress);
            await vpnRegistry.connect(owner).deactivateNode(testNodeAddress);
        });

        it("Should allow reactivating a deactivated node", async function () {
            await vpnRegistry.connect(owner).approveNode(testNodeAddress);
            const nodeDetails = await vpnRegistry.getNodeDetails(testNodeAddress);
            expect(nodeDetails[4]).to.be.true; // isActive
        });
    });

    describe("VPN Metrics and AI Scoring", function () {
        const testNodes = [
            {
                address: "0x1234567890123456789012345678901234567890",
                ip: "192.168.1.1",
                metrics: {
                    latency: 50,      // 50ms - very good
                    bandwidth: 800,    // 800 Mbps - very good
                    uptime: 99,       // 99% - excellent
                    reliability: 95    // 95% - very good
                }
            },
            {
                address: "0x2234567890123456789012345678901234567890",
                ip: "192.168.1.2",
                metrics: {
                    latency: 150,     // 150ms - average
                    bandwidth: 500,    // 500 Mbps - good
                    uptime: 95,       // 95% - very good
                    reliability: 90    // 90% - good
                }
            },
            {
                address: "0x3234567890123456789012345678901234567890",
                ip: "192.168.1.3",
                metrics: {
                    latency: 300,     // 300ms - poor
                    bandwidth: 100,    // 100 Mbps - poor
                    uptime: 85,       // 85% - average
                    reliability: 80    // 80% - average
                }
            }
        ];

        beforeEach(async function () {
            // Register and approve all test nodes
            for (const node of testNodes) {
                await vpnRegistry.connect(addr1).registerNode(node.address, node.ip);
                await vpnRegistry.connect(owner).approveNode(node.address);
                await vpnRegistry.connect(owner).updateNodeMetrics(
                    node.address,
                    node.metrics.latency,
                    node.metrics.bandwidth,
                    node.metrics.uptime,
                    node.metrics.reliability
                );
            }
        });

        it("Should calculate correct total scores", async function () {
            for (const node of testNodes) {
                const details = await vpnRegistry.getNodeDetails(node.address);
                const totalScore = details[2]; // totalScore is at index 2
                
                // Calculate expected score based on the formula in the contract
                const latencyScore = node.metrics.latency > 1000 ? 0 : ((1000 - node.metrics.latency) * 100) / 1000;
                const bandwidthScore = node.metrics.bandwidth > 1000 ? 100 : (node.metrics.bandwidth * 100) / 1000;
                const expectedScore = Math.floor(
                    (latencyScore * 30 + 
                    bandwidthScore * 25 + 
                    node.metrics.uptime * 25 + 
                    node.metrics.reliability * 20) / 100
                );
                
                expect(totalScore).to.equal(expectedScore);
            }
        });

        it("Should identify the best node correctly", async function () {
            const [bestNode, bestScore] = await vpnRegistry.getBestNode();
            
            // First node should be best due to lowest latency and highest bandwidth
            expect(bestNode).to.equal(testNodes[0].address);
        });

        it("Should return top nodes in correct order", async function () {
            const [topNodes, topScores] = await vpnRegistry.getTopNodes(3);
            
            // Verify order (should be node0 > node1 > node2 based on metrics)
            expect(topNodes[0]).to.equal(testNodes[0].address);
            expect(topNodes[1]).to.equal(testNodes[1].address);
            expect(topNodes[2]).to.equal(testNodes[2].address);
            
            // Verify scores are in descending order
            for (let i = 0; i < topScores.length - 1; i++) {
                expect(topScores[i]).to.be.gte(topScores[i + 1]);
            }
        });

        it("Should update metrics correctly", async function () {
            const newMetrics = {
                latency: 30,      // Even better latency
                bandwidth: 900,    // Higher bandwidth
                uptime: 100,      // Perfect uptime
                reliability: 98    // Excellent reliability
            };

            await vpnRegistry.connect(owner).updateNodeMetrics(
                testNodes[0].address,
                newMetrics.latency,
                newMetrics.bandwidth,
                newMetrics.uptime,
                newMetrics.reliability
            );

            const details = await vpnRegistry.getNodeDetails(testNodes[0].address);
            const totalScore = details[2]; // totalScore is at index 2
            
            // Calculate expected score
            const latencyScore = ((1000 - newMetrics.latency) * 100) / 1000;
            const bandwidthScore = (newMetrics.bandwidth * 100) / 1000;
            const expectedScore = Math.floor(
                (latencyScore * 30 + 
                bandwidthScore * 25 + 
                newMetrics.uptime * 25 + 
                newMetrics.reliability * 20) / 100
            );
            
            expect(totalScore).to.equal(expectedScore);
        });

        it("Should reject invalid metric values", async function () {
            // Try to set uptime > 100%
            await expect(
                vpnRegistry.connect(owner).updateNodeMetrics(
                    testNodes[0].address,
                    50,
                    800,
                    101, // Invalid uptime
                    95
                )
            ).to.be.revertedWith("Uptime must be <= 100");

            // Try to set reliability > 100%
            await expect(
                vpnRegistry.connect(owner).updateNodeMetrics(
                    testNodes[0].address,
                    50,
                    800,
                    99,
                    101 // Invalid reliability
                )
            ).to.be.revertedWith("Reliability must be <= 100");
        });
    });
}); 