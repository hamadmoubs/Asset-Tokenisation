// contracts/KYCWhitelist.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract KYCWhitelist {
    address public owner;

    mapping(address => bool) public whitelisted;
    mapping(address => bool) public requested;
    address[] public pendingRequests;

    // NEW: simple admin role
    mapping(address => bool) private admins;

    event Requested(address indexed user);
    event Approved(address indexed approver, address indexed user);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true; // owner is admin by default
        emit AdminAdded(msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyApprover() {
        require(msg.sender == owner || admins[msg.sender], "Not approver");
        _;
    }

    // Users call this to request whitelist approval
    function requestKYC() external {
        require(!whitelisted[msg.sender], "Already whitelisted");
        require(!requested[msg.sender], "Already requested");
        requested[msg.sender] = true;
        pendingRequests.push(msg.sender);
        emit Requested(msg.sender);
    }

    // Owner can manage admins
    function addAdmin(address a) external onlyOwner {
        require(a != address(0), "Zero addr");
        require(!admins[a], "Already admin");
        admins[a] = true;
        emit AdminAdded(a);
    }

    function removeAdmin(address a) external onlyOwner {
        require(admins[a], "Not admin");
        admins[a] = false;
        emit AdminRemoved(a);
    }

    // Approvers (owner or admin) can approve requests
    function approveKYC(address user) external onlyApprover {
        require(requested[user], "No request");
        whitelisted[user] = true;
        requested[user] = false;

        // remove from pendingRequests
        for (uint i = 0; i < pendingRequests.length; i++) {
            if (pendingRequests[i] == user) {
                pendingRequests[i] = pendingRequests[pendingRequests.length - 1];
                pendingRequests.pop();
                break;
            }
        }
        emit Approved(msg.sender, user);
    }

    // Helpers for UI
    function isWhitelisted(address user) external view returns (bool) {
        return whitelisted[user];
    }

    function isAdmin(address a) external view returns (bool) {
        return admins[a];
    }

    function canApprove(address a) external view returns (bool) {
        return a == owner || admins[a];
    }

    function getPendingRequests() external view returns (address[] memory) {
        return pendingRequests;
    }
}
