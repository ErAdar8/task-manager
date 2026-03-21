// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Storage Collision (Vulnerable)
 * @notice BASELINE: Proxy storage layout collision
 * @dev VULNERABLE: V2 uses slot 0 for different variable than V1
 * METADATA: Category: upgrades | Tier: advanced | Safe: false | Immunefi Level: 5
 */
contract StorageCollisionV1 {
    address public owner;   // slot 0
    uint256 public value;   // slot 1
}

contract StorageCollisionV2 {
    uint256 public value;   // slot 0 - COLLISION with V1's owner!
    address public owner;   // slot 1
    // Upgrading from V1 to V2 corrupts owner (slot 0 becomes value)
}
