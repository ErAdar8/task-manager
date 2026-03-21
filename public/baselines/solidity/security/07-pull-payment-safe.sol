// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

- @title Pull Payment Pattern
- @notice BASELINE: Safe payment distribution pattern
- @dev Prevents DoS and reentrancy issues
-
- KEY PATTERN: Let users withdraw (pull) instead of sending (push)
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: true
- - Tags: ["pull-pattern", "anti-dos"]
    */
    contract PullPaymentSafe {
    mapping(address => uint256) public pendingWithdrawals;
        event PaymentDeposited(address indexed payee, uint256 amount);
        event PaymentWithdrawn(address indexed payee, uint256 amount);

        /**
         * @notice SAFE: Accumulate payments for users
         * @dev No external calls, just accounting
         */
        function depositPayment(address payee) public payable {
            require(msg.value > 0, "Payment must be > 0");
            pendingWithdrawals[payee] += msg.value;
            emit PaymentDeposited(payee, msg.value);
        }

        /**
         * @notice SAFE: Users pull their own payments
         * @dev Follows checks-effects-interactions
         */
        function withdraw() public {
            uint256 amount = pendingWithdrawals[msg.sender];
            require(amount > 0, "No pending payments");

            // EFFECTS: Update state first
            pendingWithdrawals[msg.sender] = 0;

            // INTERACTIONS: Transfer last
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Transfer failed");

            emit PaymentWithdrawn(msg.sender, amount);
        }

        function getPendingPayment(address payee) public view returns (uint256) {
            return pendingWithdrawals[payee];
        }
    }