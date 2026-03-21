// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Commit-Reveal Scheme
 * @notice BASELINE: Prevent front-running of sensitive values
 * @dev SAFE: commit(hash) then reveal(value, salt)
 * METADATA: Category: advanced | Tier: advanced | Safe: true
 */
contract CommitReveal {
    mapping(address => bytes32) public commitments;
    mapping(address => bool) public revealed;

    function commit(bytes32 hash) external {
        commitments[msg.sender] = hash;
        revealed[msg.sender] = false;
    }

    function reveal(uint256 value, bytes32 salt) external {
        require(keccak256(abi.encodePacked(value, salt)) == commitments[msg.sender], "Invalid reveal");
        require(!revealed[msg.sender], "Already revealed");
        revealed[msg.sender] = true;
        delete commitments[msg.sender];
        // ... use value
    }
}
