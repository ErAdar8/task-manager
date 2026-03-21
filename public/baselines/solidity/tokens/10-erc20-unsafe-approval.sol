// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

- @title ERC20 with Approval Race Condition
- @notice BASELINE: Classic approve() vulnerability
- @dev Score: 30/100 (has race condition)
-
- VULNERABILITY: Approval can be front-run
-
- METADATA:
- - Category: tokens
- - Tier: core
- - Safe: false
- - Immunefi Level: 3 (Medium)
- - Tags: ["front-running", "approval-race"]
    */
    contract ERC20UnsafeApproval {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
        event Approval(address indexed owner, address indexed spender, uint256 value);
        event Transfer(address indexed from, address indexed to, uint256 value);

        /**
         * @notice VULNERABLE: approve() race condition
         * @dev Attacker can front-run and spend old + new allowance
         *
         * EXPLOIT:
         * 1. Alice approves Bob for 100 tokens
         * 2. Alice changes approval to 50 tokens
         * 3. Bob sees pending tx, front-runs with transferFrom(100)
         * 4. Bob's tx executes, spends 100
         * 5. Alice's approve(50) executes
         * 6. Bob calls transferFrom(50) again
         * 7. Bob spent 150 tokens instead of 50
         */
        function approve(address spender, uint256 amount) public returns (bool) {
            allowance[msg.sender][spender] = amount;
            emit Approval(msg.sender, spender, amount);
            return true;
        }

        function transferFrom(address from, address to, uint256 amount) public returns (bool) {
            require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
            require(balanceOf[from] >= amount, "Insufficient balance");

            allowance[from][msg.sender] -= amount;
            balanceOf[from] -= amount;
            balanceOf[to] += amount;

            emit Transfer(from, to, amount);
            return true;
        }

        // SAFE ALTERNATIVE: Use increaseAllowance/decreaseAllowance
        // (see erc20-safe.sol)
    }