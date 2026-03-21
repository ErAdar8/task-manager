// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Initializer Pattern (Safe)
 * @notice BASELINE: One-time initialization for upgradeable contracts
 * @dev SAFE: initializer modifier prevents re-initialization
 * METADATA: Category: upgrades | Tier: advanced | Safe: true
 */
contract InitializerPattern {
    address public owner;
    bool private _initialized;

    modifier initializer() {
        require(!_initialized, "Already initialized");
        _initialized = true;
        _;
    }

    function initialize(address _owner) public initializer {
        require(_owner != address(0), "Zero owner");
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function criticalAction() public onlyOwner {}
}
