// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Slippage Protection (Safe)
 * @notice BASELINE: minAmountOut and deadline
 * @dev SAFE: User sets minimum output, deadline prevents stale txs
 * METADATA: Category: advanced | Tier: advanced | Safe: true
 */
contract SlippageProtection {
    function swap(
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external {
        require(block.timestamp <= deadline, "Expired");
        uint256 amountOut = _getAmountOut(amountIn);
        require(amountOut >= minAmountOut, "Slippage too high");
        // ... execute swap
    }

    function _getAmountOut(uint256 amountIn) internal pure returns (uint256) {
        return amountIn; // simplified
    }
}
