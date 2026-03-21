// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

- @title Ownable Pattern
- @notice BASELINE: OpenZeppelin Ownable pattern
- @dev Score: 100/100 (perfect access control)
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: true
- - Source: OpenZeppelin
- - Tags: ["fundamental", "access-control"]
    */
    contract OwnablePattern {
    address public owner;
        event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

        modifier onlyOwner() {
            require(msg.sender == owner, "Caller is not the owner");
            _;
        }

        constructor() {
            owner = msg.sender;
            emit OwnershipTransferred(address(0), msg.sender);
        }

        function transferOwnership(address newOwner) public onlyOwner {
            require(newOwner != address(0), "New owner cannot be zero address");
            emit OwnershipTransferred(owner, newOwner);
            owner = newOwner;
        }

        function criticalAction() public onlyOwner {
            // Privileged operation
        }

        function withdrawAll() public onlyOwner {
            payable(owner).transfer(address(this).balance);
        }

        receive() external payable {}
    }