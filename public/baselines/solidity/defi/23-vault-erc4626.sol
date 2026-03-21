// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ERC4626 Vault (Simplified)
 * @notice BASELINE: Tokenized vault standard
 * @dev Safe implementation without attack vectors
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: true
 * - Standard: ERC4626
 * - Tags: ["vault", "shares", "yield"]
 */
contract VaultERC4626 {
    string public name = "Vault Shares";
    string public symbol = "vToken";
    uint8 public decimals = 18;

    uint256 public totalAssets;
    uint256 public totalShares;

    mapping(address => uint256) public sharesOf;

    event Deposit(address indexed user, uint256 assets, uint256 shares);
    event Withdraw(address indexed user, uint256 assets, uint256 shares);

    /**
     * @notice Deposit assets and receive shares
     * @dev Shares = (assets * totalShares) / totalAssets
     */
    function deposit(uint256 assets) public payable returns (uint256 shares) {
        require(assets > 0, "Must deposit > 0");
        require(msg.value == assets, "ETH mismatch");

        if (totalShares == 0) {
            // First depositor gets 1:1 ratio
            shares = assets;
        } else {
            // Calculate shares based on current ratio
            shares = (assets * totalShares) / totalAssets;
        }

        require(shares > 0, "Shares must be > 0");

        totalAssets += assets;
        totalShares += shares;
        sharesOf[msg.sender] += shares;

        emit Deposit(msg.sender, assets, shares);
    }

    /**
     * @notice Redeem shares for assets
     * @dev Assets = (shares * totalAssets) / totalShares
     */
    function withdraw(uint256 shares) public returns (uint256 assets) {
        require(shares > 0, "Must withdraw > 0");
        require(sharesOf[msg.sender] >= shares, "Insufficient shares");

        assets = (shares * totalAssets) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= assets;

        payable(msg.sender).transfer(assets);

        emit Withdraw(msg.sender, assets, shares);
    }

    /**
     * @notice Convert assets to shares
     */
    function convertToShares(uint256 assets) public view returns (uint256) {
        if (totalShares == 0) return assets;
        return (assets * totalShares) / totalAssets;
    }

    /**
     * @notice Convert shares to assets
     */
    function convertToAssets(uint256 shares) public view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares * totalAssets) / totalShares;
    }

    /**
     * @notice Simulate yield by increasing totalAssets
     * @dev In production, this would come from yield strategies
     */
    function simulateYield(uint256 amount) public payable {
        require(msg.value == amount, "ETH mismatch");
        totalAssets += amount;
    }
}