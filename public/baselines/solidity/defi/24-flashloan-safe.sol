// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Flash Loan (Safe)
 * @notice BASELINE: Flash loan with balance verification
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: true
 * - Tags: ["flashloan", "defi"]
 */

interface IFlashLoanReceiver {
    function executeOperation(uint256 amount, uint256 fee) external returns (bool);
}

contract FlashLoanSafe {
    uint256 public poolBalance = 1000 ether;
    uint256 public feePercent = 1; // 0.1% fee

    event FlashLoan(address indexed borrower, uint256 amount, uint256 fee);

    /**
     * @notice Execute flash loan
     * @dev SAFE: Verifies balance is restored + fee
     */
    function flashLoan(address receiver, uint256 amount) public {
        uint256 balanceBefore = poolBalance;
        require(poolBalance >= amount, "Insufficient liquidity");

        uint256 fee = (amount * feePercent) / 1000;

        // Send funds to borrower
        poolBalance -= amount;
        payable(receiver).transfer(amount);

        // Execute borrower's logic
        require(
            IFlashLoanReceiver(receiver).executeOperation(amount, fee),
            "Flash loan execution failed"
        );

        // CRITICAL: Verify repayment + fee
        require(
            poolBalance >= balanceBefore + fee,
            "Flash loan not repaid with fee"
        );

        emit FlashLoan(receiver, amount, fee);
    }

    function addLiquidity() public payable {
        poolBalance += msg.value;
    }

    receive() external payable {
        poolBalance += msg.value;
    }
}