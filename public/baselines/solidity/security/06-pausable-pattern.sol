// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

- @title Pausable Pattern
- @notice BASELINE: OpenZeppelin Pausable pattern
- @dev Emergency stop mechanism
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: true
- - Source: OpenZeppelin
    */
    contract PausablePattern {
    address public owner;
    bool public paused;
        event Paused(address account);
        event Unpaused(address account);

        modifier onlyOwner() {
            require(msg.sender == owner, "Not owner");
            _;
        }

        modifier whenNotPaused() {
            require(!paused, "Contract is paused");
            _;
        }

        modifier whenPaused() {
            require(paused, "Contract is not paused");
            _;
        }

        constructor() {
            owner = msg.sender;
            paused = false;
        }

        function pause() public onlyOwner whenNotPaused {
            paused = true;
            emit Paused(msg.sender);
        }

        function unpause() public onlyOwner whenPaused {
            paused = false;
            emit Unpaused(msg.sender);
        }

        function criticalOperation() public whenNotPaused {
            // Can be paused in emergency
        }

        function deposit() public payable whenNotPaused {
            // Protected operation
        }
    }