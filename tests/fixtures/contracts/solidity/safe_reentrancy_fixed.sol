// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * SAFE CONTRACT — no reentrancy vulnerability.
 * State is updated (line 22) BEFORE external call (line 24).
 * Use to validate analyzer does NOT report false positive reentrancy here.
 */
contract SafeReentrancyFixed {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient balance");
        balances[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "transfer failed");
    }
}
