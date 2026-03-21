// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Safe Math (Solidity 0.8+)
 * @notice BASELINE: Automatic overflow checks in Solidity 0.8+
 * @dev Score: 100/100
 *
 * METADATA:
 * - Category: math
 * - Tier: core
 * - Safe: true
 * - Tags: ["overflow-protection", "solidity-0.8"]
 */
contract SafeMath08 {
    uint256 public value;

    event ValueChanged(uint256 newValue);

    /**
     * @notice SAFE: Overflow reverts automatically in 0.8+
     */
    function add(uint256 amount) public {
        value += amount;  // Reverts on overflow
        emit ValueChanged(value);
    }

    /**
     * @notice SAFE: Underflow reverts automatically
     */
    function subtract(uint256 amount) public {
        value -= amount;  // Reverts on underflow
        emit ValueChanged(value);
    }

    /**
     * @notice SAFE: Multiplication overflow reverts
     */
    function multiply(uint256 factor) public {
        value *= factor;  // Reverts on overflow
        emit ValueChanged(value);
    }

    /**
     * @notice SAFE: Division by zero reverts
     */
    function divide(uint256 divisor) public {
        value /= divisor;  // Reverts if divisor == 0
        emit ValueChanged(value);
    }
}