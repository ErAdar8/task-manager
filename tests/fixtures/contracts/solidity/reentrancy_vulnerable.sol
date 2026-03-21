// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Intentionally vulnerable: classic reentrancy.
 * External call before state update (classic CEI violation).
 * Use for bounty hunter validation — analyzer must report exact line numbers and code snippet.
 */
contract ReentrancyVulnerable {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient balance");
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "transfer failed");
        balances[msg.sender] -= amount;
    }
}
