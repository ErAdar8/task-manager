// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

- @title Fee-on-Transfer Token Handling
- @notice BASELINE: How to handle tokens that take fees on transfer
- @dev Some tokens (e.g., SAFEMOON) deduct fees during transfer
-
- METADATA:
- - Category: tokens
- - Tier: core
- - Safe: mixed (shows both vulnerable and safe patterns)
- - Immunefi Level: 3 (Medium) if not handled
    */

interface IERC20 {
function balanceOf(address account) external view returns (uint256);
function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract FeeOnTransferHandler {
mapping(address => uint256) public userDeposits;

    /**
     * @notice VULNERABLE: Assumes full amount received
     * @dev If token takes 10% fee, only 90% actually received but user credited for 100%
     */
    function depositVulnerable(address token, uint256 amount) public {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        userDeposits[msg.sender] += amount;  // WRONG: credited more than received
    }

    /**
     * @notice SAFE: Checks actual received amount
     */
    function depositSafe(address token, uint256 amount) public returns (uint256) {
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        uint256 actualReceived = balanceAfter - balanceBefore;

        // Credit user for actual amount received
        userDeposits[msg.sender] += actualReceived;

        return actualReceived;
    }

    function withdraw(address token, uint256 amount) public {
        require(userDeposits[msg.sender] >= amount, "Insufficient balance");
        userDeposits[msg.sender] -= amount;
        IERC20(token).transferFrom(address(this), msg.sender, amount);
    }

}