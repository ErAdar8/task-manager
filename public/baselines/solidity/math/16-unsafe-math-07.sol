// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;  // Pre-0.8.0

/**
 * @title Unsafe Math (Solidity < 0.8.0)
 * @notice BASELINE: Integer overflow vulnerability
 * @dev Score: 0/100 (vulnerable)
 *
 * VULNERABILITY: Arithmetic wraps around silently
 *
 * METADATA:
 * - Category: math
 * - Tier: core
 * - Safe: false
 * - Immunefi Level: 5 (Critical in some contexts)
 * - Historical: BEC Token overflow (2018)
 */
contract UnsafeMath07 {
    uint256 public value;

    /**
     * @notice VULNERABLE: Silent overflow
     * @dev If value = 2^256 - 1, adding 1 wraps to 0
     */
    function add(uint256 amount) public {
        value += amount;  // Can overflow silently
    }

    /**
     * @notice VULNERABLE: Silent underflow
     * @dev If value = 0, subtracting 1 wraps to 2^256 - 1
     */
    function subtract(uint256 amount) public {
        value -= amount;  // Can underflow silently
    }

    /**
     * @notice VULNERABLE: Multiplication overflow
     */
    function multiply(uint256 factor) public {
        value *= factor;  // Can overflow silently
    }

    // SAFE ALTERNATIVE: Use SafeMath library (OpenZeppelin)
    // Or upgrade to Solidity 0.8+
}