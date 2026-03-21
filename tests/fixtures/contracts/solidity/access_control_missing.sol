// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Intentionally vulnerable: critical functions lack access control.
 * - setOwner (line 18): anyone can become owner
 * - withdrawAll (line 24): no onlyOwner or role check
 * Use for bounty validation: missing modifier / role check.
 */
contract AccessControlMissing {
    address public owner;
    uint256 public totalFunds;

    constructor() {
        owner = msg.sender;
    }

    function setOwner(address newOwner) external {
        owner = newOwner;
    }

    function deposit() external payable {
        totalFunds += msg.value;
    }

    function withdrawAll() external {
        uint256 amount = totalFunds;
        totalFunds = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok);
    }
}
