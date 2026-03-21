// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Intentionally risky: unchecked block (lines 22-24) can overflow/underflow.
 * Solidity 0.8+ reverts on overflow by default; unchecked disables that.
 * Analyzer should flag unchecked arithmetic with exact line numbers.
 */
contract IntegerOverflowUnchecked {
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        unchecked {
            totalSupply += amount;
            balanceOf[to] += amount;
        }
    }

    function burn(address from, uint256 amount) external {
        unchecked {
            balanceOf[from] -= amount;
            totalSupply -= amount;
        }
    }
}
