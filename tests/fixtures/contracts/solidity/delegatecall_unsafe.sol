// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Intentionally vulnerable: delegatecall to user-supplied target (line 20).
 * Attacker can point to malicious contract and run code in this contract's context.
 * Analyzer should report unsafe delegatecall with exact line.
 */
contract DelegateCallUnsafe {
    address public implementation;
    address public owner;
    uint256 public value;

    function setImplementation(address _impl) external {
        implementation = _impl;
    }

    function execute(bytes calldata data) external returns (bytes memory) {
        (bool ok, bytes memory result) = implementation.delegatecall(data);
        require(ok, "delegatecall failed");
        return result;
    }
}
