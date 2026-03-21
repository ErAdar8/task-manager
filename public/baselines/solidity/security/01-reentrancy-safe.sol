// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

- @title Reentrancy Safe Pattern
- @notice BASELINE: OpenZeppelin ReentrancyGuard pattern
- @dev Score: 100/100 (perfect implementation)
-
- KEY PATTERN: State update BEFORE external call
- This is the gold standard for preventing reentrancy attacks.
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: true
- - Immunefi Level: N/A (this is the safe pattern)
- - Tags: ["fundamental", "required", "checks-effects-interactions"]
    */
    contract ReentrancySafe {
    mapping(address => uint256) public balances;
        event Deposit(address indexed user, uint256 amount);
        event Withdrawal(address indexed user, uint256 amount);

        function deposit() public payable {
            require(msg.value > 0, "Deposit amount must be > 0");
            balances[msg.sender] += msg.value;
            emit Deposit(msg.sender, msg.value);
        }

        /**
         * @notice SAFE: Follows checks-effects-interactions pattern
         * @dev State is updated BEFORE external call
         */
        function withdraw(uint256 amount) public {
            // CHECKS
            require(amount > 0, "Withdrawal amount must be > 0");
            require(balances[msg.sender] >= amount, "Insufficient balance");

            // EFFECTS (state update FIRST)
            balances[msg.sender] -= amount;

            // INTERACTIONS (external call LAST)
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Transfer failed");

            emit Withdrawal(msg.sender, amount);
        }

        function getBalance(address user) public view returns (uint256) {
            return balances[user];
        }

        receive() external payable {
            deposit();
        }
    }