// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// REFERENCE: OpenZeppelin ReentrancyGuard pattern
// Use this as baseline for reentrancy checks

contract SafeWithdrawalPattern {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // SAFE PATTERN: Update state BEFORE external call
        balances[msg.sender] -= amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
