// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// REFERENCE: OpenZeppelin Ownable pattern
// Use this as baseline for access control checks

contract SafeAccessControlPattern {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // SAFE PATTERN: Critical function with access control
    function setOwner(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    function withdrawAll() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
