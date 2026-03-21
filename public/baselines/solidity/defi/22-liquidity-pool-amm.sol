// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Liquidity Pool AMM
 * @notice BASELINE: Simplified constant product AMM (Uniswap-style)
 * @dev x * y = k formula
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: true (simplified, production needs more checks)
 * - Tags: ["amm", "liquidity", "swap"]
 */
contract LiquidityPoolAMM {
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public totalLiquidity;

    mapping(address => uint256) public liquidity;

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidityMinted);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidityBurned);
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut, bool aToB);

    /**
     * @notice Add liquidity to pool
     * @dev First provider sets the ratio
     */
    function addLiquidity(uint256 amountA, uint256 amountB) public payable returns (uint256 liquidityMinted) {
        require(amountA > 0 && amountB > 0, "Amounts must be > 0");

        if (totalLiquidity == 0) {
            // First liquidity provider
            liquidityMinted = sqrt(amountA * amountB);
        } else {
            // Subsequent providers must match ratio
            uint256 liquidityA = (amountA * totalLiquidity) / reserveA;
            uint256 liquidityB = (amountB * totalLiquidity) / reserveB;
            liquidityMinted = min(liquidityA, liquidityB);
        }

        require(liquidityMinted > 0, "Insufficient liquidity minted");

        reserveA += amountA;
        reserveB += amountB;
        totalLiquidity += liquidityMinted;
        liquidity[msg.sender] += liquidityMinted;

        emit LiquidityAdded(msg.sender, amountA, amountB, liquidityMinted);
    }

    /**
     * @notice Remove liquidity from pool
     */
    function removeLiquidity(uint256 liquidityAmount) public returns (uint256 amountA, uint256 amountB) {
        require(liquidity[msg.sender] >= liquidityAmount, "Insufficient liquidity");

        amountA = (liquidityAmount * reserveA) / totalLiquidity;
        amountB = (liquidityAmount * reserveB) / totalLiquidity;

        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;
        reserveA -= amountA;
        reserveB -= amountB;

        // Transfer tokens back (simplified - in production use token transfers)
        payable(msg.sender).transfer(amountA + amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidityAmount);
    }

    /**
     * @notice Swap token A for token B
     * @dev Constant product formula: x * y = k
     */
    function swapAforB(uint256 amountAIn) public returns (uint256 amountBOut) {
        require(amountAIn > 0, "Amount must be > 0");

        // Calculate output using constant product formula
        // (x + dx) * (y - dy) = x * y
        // dy = y * dx / (x + dx)
        uint256 amountBOut = (amountAIn * reserveB) / (reserveA + amountAIn);

        require(amountBOut < reserveB, "Insufficient liquidity");

        reserveA += amountAIn;
        reserveB -= amountBOut;

        emit Swap(msg.sender, amountAIn, amountBOut, true);
        return amountBOut;
    }

    /**
     * @notice Swap token B for token A
     */
    function swapBforA(uint256 amountBIn) public returns (uint256 amountAOut) {
        require(amountBIn > 0, "Amount must be > 0");

        uint256 amountAOut = (amountBIn * reserveA) / (reserveB + amountBIn);

        require(amountAOut < reserveA, "Insufficient liquidity");

        reserveB += amountBIn;
        reserveA -= amountAOut;

        emit Swap(msg.sender, amountBIn, amountAOut, false);
        return amountAOut;
    }

    // Helper functions
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    receive() external payable {}
}