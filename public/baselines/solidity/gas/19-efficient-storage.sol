// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Efficient Storage Patterns
 * @notice BASELINE: Gas-efficient storage layout
 * @dev Score: 100/100
 *
 * METADATA:
 * - Category: gas
 * - Tier: core
 * - Safe: true
 * - Tags: ["gas-optimization", "storage-packing"]
 */
contract EfficientStorage {

    // EFFICIENT: Variables packed into same slot (saves ~20k gas on deployment)
    uint128 public value1;  // Slot 0 (first 16 bytes)
    uint128 public value2;  // Slot 0 (last 16 bytes)

    // EFFICIENT: Smaller types packed together
    uint64 public timestamp;   // Slot 1 (first 8 bytes)
    uint64 public counter;     // Slot 1 (next 8 bytes)
    uint64 public id;          // Slot 1 (next 8 bytes)
    uint64 public flags;       // Slot 1 (last 8 bytes)

    // LESS EFFICIENT: Each takes full slot
    // uint256 public value1;  // Slot 0
    // uint256 public value2;  // Slot 1

    /**
     * @notice EFFICIENT: Mappings over arrays when possible
     * @dev Mappings don't need iteration, cheaper for lookups
     */
    mapping(address => bool) public whitelist;

    /**
     * @notice INEFFICIENT: Array requires iteration
     */
    // address[] public whitelistedAddresses;

    /**
     * @notice EFFICIENT: Use uint256 for counters (not uint8)
     * @dev Despite being smaller, uint8/uint16 require conversion (costs gas)
     */
    uint256 public operationCounter;

    /**
     * @notice EFFICIENT: Pack boolean flags into single uint256
     */
    uint256 private _packedFlags;

    function setFlag(uint8 flagIndex, bool value) public {
        if (value) {
            _packedFlags |= (1 << flagIndex);  // Set bit
        } else {
            _packedFlags &= ~(1 << flagIndex);  // Clear bit
        }
    }

    function getFlag(uint8 flagIndex) public view returns (bool) {
        return (_packedFlags & (1 << flagIndex)) != 0;
    }

    /**
     * @notice EFFICIENT: Cache storage reads in memory
     */
    function expensiveOperation() public {
        // BAD: Reading from storage multiple times
        // for (uint i = 0; i < operationCounter; i++) { ... }

        // GOOD: Cache in memory
        uint256 cachedCounter = operationCounter;
        for (uint i = 0; i < cachedCounter; i++) {
            // Use cached value
        }
    }
}