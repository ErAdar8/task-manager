// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Revert Griefing (DoS)
 * @notice BASELINE: DoS via intentional revert
 * @dev One bad actor can block all operations
 *
 * METADATA:
 * - Category: gas
 * - Tier: core
 * - Safe: false (vulnerable pattern shown)
 * - Immunefi Level: 3 (Medium)
 * - Tags: ["dos", "revert-griefing"]
 */
contract RevertGriefing {
    address[] public payees;
    mapping(address => uint256) public pendingPayments;

    event PaymentPrepared(address payee, uint256 amount);
    event PaymentSent(address payee, uint256 amount);
    event PaymentFailed(address payee, uint256 amount);

    function addPayee(address payee) public {
        payees.push(payee);
    }

    /**
     * @notice VULNERABLE: Push payments in loop
     * @dev If ANY payee reverts, entire batch fails
     *
     * EXPLOIT:
     * 1. Attacker deploys contract with receive() that reverts
     * 2. Attacker adds their contract as payee
     * 3. When distributeVulnerable() is called, it reaches attacker's contract
     * 4. Attacker's receive() reverts
     * 5. ENTIRE transaction fails - nobody gets paid (DoS)
     */
    function distributeVulnerable() public {
        for (uint256 i = 0; i < payees.length; i++) {
            payable(payees[i]).transfer(pendingPayments[payees[i]]);
            emit PaymentSent(payees[i], pendingPayments[payees[i]]);
        }
    }

    /**
     * @notice SAFE: Pull payment pattern
     * @dev Users pull their own payments
     */
    function preparePullPayments() public {
        for (uint256 i = 0; i < payees.length; i++) {
            pendingPayments[payees[i]] += 1 ether;
            emit PaymentPrepared(payees[i], 1 ether);
        }
        // No external calls - can't be griefed
    }

    function withdraw() public {
        uint256 amount = pendingPayments[msg.sender];
        require(amount > 0, "No pending payment");
        pendingPayments[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        emit PaymentSent(msg.sender, amount);
    }

    /**
     * @notice SAFE: Try-catch for external calls
     * @dev Continue even if one payment fails
     */
    function distributeSafe() public {
        for (uint256 i = 0; i < payees.length; i++) {
            try this.sendPayment(payable(payees[i]), pendingPayments[payees[i]]) {
                emit PaymentSent(payees[i], pendingPayments[payees[i]]);
            } catch {
                emit PaymentFailed(payees[i], pendingPayments[payees[i]]);
                // Failed, but continue with others
            }
        }
    }

    function sendPayment(address payable recipient, uint256 amount) external {
        recipient.transfer(amount);
    }

    receive() external payable {}
}

/**
 * @title Griefing Attacker
 * @notice Contract that reverts on receive to grief payments
 */
contract GriefingAttacker {
    receive() external payable {
        revert("Griefing attack!");
    }
}