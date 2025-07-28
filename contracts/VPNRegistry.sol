// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVPNSubscription {
    function isSubscriptionActive(uint256 tokenId) external view returns (bool);
}

contract VPNRegistry {
    // Enhanced VPN node details with practical metrics
    struct VPNNode {
        string ipAddress;
        address owner;
        bool isApproved;
        bool isActive;
        uint256 timestamp;  // When the node was registered
        // AI Scoring Metrics
        uint256 latency;        // in milliseconds (lower is better)
        uint256 bandwidth;      // in Mbps (higher is better)
        uint256 uptime;         // percentage (0-100)
        uint256 reliability;    // percentage (0-100)
        uint256 totalScore;     // Combined AI score (0-100)
    }

    // State variables
    address public admin;
    address public vpnSubscriptionContract;
    mapping(address => bool) public admins;  // Track all admin addresses
    mapping(address => VPNNode) public nodes;
    address[] public nodeAddresses;
    mapping(address => bool) public registeredNodes;

    // Events
    event NodeRegistered(address indexed nodeAddress, string ipAddress, address indexed owner);
    event NodeApproved(address indexed nodeAddress);
    event NodeDeactivated(address indexed nodeAddress);
    event AdminAdded(address indexed newAdmin);
    event AdminRemoved(address indexed removedAdmin);
    event MetricsUpdated(
        address indexed nodeAddress, 
        uint256 latency, 
        uint256 bandwidth, 
        uint256 uptime,
        uint256 reliability,
        uint256 totalScore
    );

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin || admins[msg.sender], "Only admin can perform this action");
        _;
    }

    modifier nodeExists(address nodeAddress) {
        require(registeredNodes[nodeAddress], "Node does not exist");
        _;
    }

    modifier onlySuperAdmin() {
        require(msg.sender == admin, "Only super admin can perform this action");
        _;
    }

    // Constructor
    constructor(address _vpnSubscriptionContract) {
        require(_vpnSubscriptionContract != address(0), "Invalid subscription contract");
        admin = msg.sender;
        admins[msg.sender] = true;  // Add deployer as admin
        vpnSubscriptionContract = _vpnSubscriptionContract;
    }

    // Admin management functions
    function addAdmin(address newAdmin) external onlySuperAdmin {
        require(newAdmin != address(0), "Invalid address");
        require(!admins[newAdmin], "Address is already an admin");
        admins[newAdmin] = true;
        emit AdminAdded(newAdmin);
    }

    function removeAdmin(address adminToRemove) external onlySuperAdmin {
        require(adminToRemove != admin, "Cannot remove super admin");
        require(admins[adminToRemove], "Address is not an admin");
        admins[adminToRemove] = false;
        emit AdminRemoved(adminToRemove);
    }

    function isAdmin(address account) external view returns (bool) {
        return account == admin || admins[account];
    }

    // Functions
    function isValidIPv4(string memory ip) internal pure returns (bool) {
        bytes memory ipBytes = bytes(ip);
        uint dotCount = 0;
        uint currentNumber = 0;
        uint lastDotIndex = 0;
        
        for (uint i = 0; i < ipBytes.length; i++) {
            if (ipBytes[i] == ".") {
                if (i == lastDotIndex + 1 || i == 0) return false; // consecutive dots or starts with dot
                dotCount++;
                if (dotCount > 3) return false; // too many dots
                currentNumber = 0;
                lastDotIndex = i;
            } else {
                // Check if character is a digit
                if (uint8(ipBytes[i]) < 48 || uint8(ipBytes[i]) > 57) return false;
                currentNumber = currentNumber * 10 + (uint8(ipBytes[i]) - 48);
                if (currentNumber > 255) return false; // octet too large
            }
        }
        
        return dotCount == 3 && ipBytes.length > lastDotIndex + 1; // must have exactly 3 dots and end with a number
    }

    function registerNode(address nodeAddress, string memory ipAddress) external {
        require(!registeredNodes[nodeAddress], "Node already registered");
        require(bytes(ipAddress).length > 0, "IP address cannot be empty");
        require(isValidIPv4(ipAddress), "Invalid IP address format");

        nodes[nodeAddress] = VPNNode({
            ipAddress: ipAddress,
            owner: msg.sender,
            isApproved: false,
            isActive: false,
            timestamp: block.timestamp,
            latency: 0,
            bandwidth: 0,
            uptime: 100,    // Start with 100% uptime
            reliability: 0,
            totalScore: 0
        });

        nodeAddresses.push(nodeAddress);
        registeredNodes[nodeAddress] = true;

        emit NodeRegistered(nodeAddress, ipAddress, msg.sender);
    }

    function approveNode(address nodeAddress) external onlyAdmin nodeExists(nodeAddress) {
        nodes[nodeAddress].isApproved = true;
        nodes[nodeAddress].isActive = true;
        
        emit NodeApproved(nodeAddress);
    }

    function deactivateNode(address nodeAddress) external nodeExists(nodeAddress) {
        require(msg.sender == admin || msg.sender == nodes[nodeAddress].owner, 
                "Only admin or node owner can deactivate");
        
        nodes[nodeAddress].isActive = false;
        
        emit NodeDeactivated(nodeAddress);
    }

    // Update node metrics and calculate total score
    function updateNodeMetrics(
        address nodeAddress,
        uint256 _latency,
        uint256 _bandwidth,
        uint256 _uptime,
        uint256 _reliability
    ) external onlyAdmin nodeExists(nodeAddress) {
        require(_uptime <= 100, "Uptime must be <= 100");
        require(_reliability <= 100, "Reliability must be <= 100");
        
        VPNNode storage node = nodes[nodeAddress];
        
        node.latency = _latency;
        node.bandwidth = _bandwidth;
        node.uptime = _uptime;
        node.reliability = _reliability;
        
        // Calculate total score (0-100) based on weighted metrics
        // Lower latency is better, so we invert it in the calculation
        uint256 latencyScore = _latency > 1000 ? 0 : ((1000 - _latency) * 100) / 1000;
        uint256 bandwidthScore = _bandwidth > 1000 ? 100 : (_bandwidth * 100) / 1000;
        
        node.totalScore = (
            (latencyScore * 30) +    // 30% weight for latency
            (bandwidthScore * 25) +  // 25% weight for bandwidth
            (_uptime * 25) +         // 25% weight for uptime
            (_reliability * 20)       // 20% weight for reliability
        ) / 100;                     // Divide by 100 to get final score 0-100

        emit MetricsUpdated(
            nodeAddress,
            _latency,
            _bandwidth,
            _uptime,
            _reliability,
            node.totalScore
        );
    }

    // Get the best available node based on total score
    function getBestNode() external view returns (address, uint256) {
        require(nodeAddresses.length > 0, "No nodes registered");
        
        address bestNode;
        uint256 highestScore = 0;
        
        for (uint256 i = 0; i < nodeAddresses.length; i++) {
            address currentNode = nodeAddresses[i];
            if (nodes[currentNode].isActive && nodes[currentNode].isApproved) {
                if (nodes[currentNode].totalScore > highestScore) {
                    highestScore = nodes[currentNode].totalScore;
                    bestNode = currentNode;
                }
            }
        }
        
        require(bestNode != address(0), "No active nodes found");
        return (bestNode, highestScore);
    }

    // Get top N nodes sorted by score
    function getTopNodes(uint256 count) external view returns (address[] memory, uint256[] memory) {
        require(count > 0, "Count must be greater than 0");
        
        // Count active nodes first
        uint256 activeCount = 0;
        for (uint256 i = 0; i < nodeAddresses.length; i++) {
            if (nodes[nodeAddresses[i]].isActive && nodes[nodeAddresses[i]].isApproved) {
                activeCount++;
            }
        }
        
        // Adjust count if it's greater than active nodes
        if (count > activeCount) {
            count = activeCount;
        }
        
        // Create temporary arrays for sorting
        address[] memory activeNodes = new address[](activeCount);
        uint256[] memory scores = new uint256[](activeCount);
        uint256 index = 0;
        
        // Fill arrays with active nodes
        for (uint256 i = 0; i < nodeAddresses.length; i++) {
            if (nodes[nodeAddresses[i]].isActive && nodes[nodeAddresses[i]].isApproved) {
                activeNodes[index] = nodeAddresses[i];
                scores[index] = nodes[nodeAddresses[i]].totalScore;
                index++;
            }
        }
        
        // Sort arrays by score (simple bubble sort)
        for (uint256 i = 0; i < activeCount - 1; i++) {
            for (uint256 j = 0; j < activeCount - i - 1; j++) {
                if (scores[j] < scores[j + 1]) {
                    // Swap scores
                    uint256 tempScore = scores[j];
                    scores[j] = scores[j + 1];
                    scores[j + 1] = tempScore;
                    
                    // Swap addresses
                    address tempAddr = activeNodes[j];
                    activeNodes[j] = activeNodes[j + 1];
                    activeNodes[j + 1] = tempAddr;
                }
            }
        }
        
        // Create result arrays with requested count
        address[] memory topNodes = new address[](count);
        uint256[] memory topScores = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            topNodes[i] = activeNodes[i];
            topScores[i] = scores[i];
        }
        
        return (topNodes, topScores);
    }

    // View functions
    function getActiveNodes() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // First, count active nodes
        for (uint256 i = 0; i < nodeAddresses.length; i++) {
            if (nodes[nodeAddresses[i]].isActive && nodes[nodeAddresses[i]].isApproved) {
                activeCount++;
            }
        }

        // Create array of active nodes
        address[] memory activeNodes = new address[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < nodeAddresses.length; i++) {
            if (nodes[nodeAddresses[i]].isActive && nodes[nodeAddresses[i]].isApproved) {
                activeNodes[currentIndex] = nodeAddresses[i];
                currentIndex++;
            }
        }

        return activeNodes;
    }

    function getNodeDetails(address nodeAddress) external view nodeExists(nodeAddress) 
        returns (string memory, address, uint256, bool, bool, uint256) 
    {
        VPNNode memory node = nodes[nodeAddress];
        return (
            node.ipAddress,
            node.owner,
            node.totalScore,
            node.isApproved,
            node.isActive,
            node.timestamp
        );
    }

    // Function to check if a user has an active subscription
    function canAccessNodes(uint256 tokenId) public view returns (bool) {
        IVPNSubscription subscription = IVPNSubscription(vpnSubscriptionContract);
        return subscription.isSubscriptionActive(tokenId);
    }
}