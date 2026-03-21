// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Unchecked Block (Intentional Overflow)
 * @notice BASELINE: When you NEED overflow (rare)
 * @dev Score: 50/100 (risky but intentional)
 *
 * METADATA:
 * - Category: math
 * - Tier: core
 * - Safe: conditional (must understand implications)
 * - Tags: ["gas-optimization", "intentional-overflow"]
 */
contract UncheckedArithmetic {
    uint256 public counter;
    uint256 public sum;

    /**
     * @notice RISKY: unchecked disables overflow protection
     * @dev Use ONLY when you understand the implications
     * Common use case: counter that's allowed to wrap
     */
    function incrementUnchecked() public {
        unchecked {
            counter++;  // Can overflow without reverting
            // Gas savings: ~20-30 gas per operation
        }
    }

    /**
     * @notice SAFE: Default behavior
     */
    function incrementSafe() public {
        counter++;  // Reverts on overflow
    }

    /**
     * @notice DANGEROUS: Unchecked arithmetic on user funds
     * @dev This is almost never safe for financial calculations
     */
    function addUnchecked(uint256 amount) public {
        unchecked {
            sum += amount;  // DANGEROUS: Can overflow and lose funds
        }
    }

    /**
     * @notice SAFE: Checked arithmetic for user funds
     */
    function addSafe(uint256 amount) public {
        sum += amount;  // Always use checked for financial calculations
    }
}