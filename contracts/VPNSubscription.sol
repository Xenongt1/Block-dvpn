// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract VPNSubscription is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    // Subscription duration in seconds (30 days)
    uint256 public constant SUBSCRIPTION_DURATION = 30 days;
    
    // Subscription price in wei (0.00001 ETH)
    uint256 public constant SUBSCRIPTION_PRICE = 0.00001 ether;
    
    // Mapping from token ID to subscription expiry timestamp
    mapping(uint256 => uint256) public subscriptionExpiry;
    
    // Mapping from address to their latest token ID
    mapping(address => uint256) public userLatestToken;

    constructor() ERC721("VPN Subscription", "VPNS") {}

    function subscribe() public payable returns (uint256) {
        require(msg.value >= SUBSCRIPTION_PRICE, "Insufficient payment");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(msg.sender, newTokenId);
        
        // Set subscription expiry to current time + duration
        subscriptionExpiry[newTokenId] = block.timestamp + SUBSCRIPTION_DURATION;
        
        // Update user's latest token
        userLatestToken[msg.sender] = newTokenId;
        
        return newTokenId;
    }

    function isSubscriptionActive(uint256 tokenId) public view returns (bool) {
        require(_exists(tokenId), "Subscription does not exist");
        return block.timestamp <= subscriptionExpiry[tokenId];
    }

    function hasActiveSubscription(address user) public view returns (bool) {
        uint256 tokenId = userLatestToken[user];
        if (tokenId == 0) return false;
        return isSubscriptionActive(tokenId);
    }

    function getRemainingTime(address user) public view returns (uint256) {
        uint256 tokenId = userLatestToken[user];
        require(tokenId > 0, "No subscription found");
        require(_exists(tokenId), "Subscription does not exist");
        
        uint256 expiry = subscriptionExpiry[tokenId];
        if (block.timestamp >= expiry) return 0;
        return expiry - block.timestamp;
    }

    function renewSubscription(uint256 tokenId) public payable {
        require(_exists(tokenId), "Subscription does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not subscription owner");
        require(msg.value >= SUBSCRIPTION_PRICE, "Insufficient payment");
        
        // Extend subscription from current expiry or current time, whichever is later
        uint256 newExpiry = max(subscriptionExpiry[tokenId], block.timestamp) + SUBSCRIPTION_DURATION;
        subscriptionExpiry[tokenId] = newExpiry;
    }

    function getSubscriptionExpiry(uint256 tokenId) public view returns (uint256) {
        require(_exists(tokenId), "Subscription does not exist");
        return subscriptionExpiry[tokenId];
    }

    function withdrawFunds() public onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    function cancelSubscription() public {
        uint256 tokenId = userLatestToken[msg.sender];
        require(tokenId > 0, "No subscription found");
        require(_exists(tokenId), "Subscription does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not subscription owner");
        
        // Check if within 24 hours of subscription start
        uint256 subscriptionStart = subscriptionExpiry[tokenId] - SUBSCRIPTION_DURATION;
        require(block.timestamp <= subscriptionStart + 24 hours, "Cancellation period expired");
        
        // Refund the subscription fee
        (bool success, ) = msg.sender.call{value: SUBSCRIPTION_PRICE}("");
        require(success, "Refund transfer failed");
        
        // Burn the token
        _burn(tokenId);
        delete subscriptionExpiry[tokenId];
        delete userLatestToken[msg.sender];
    }
} 