// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Merkle Proof Whitelist
 * @notice BASELINE: Gas-efficient whitelist
 * @dev SAFE: Merkle root + proof verification
 * METADATA: Category: advanced | Tier: advanced | Safe: true
 */
contract MerkleWhitelist {
    bytes32 public merkleRoot;
    mapping(address => bool) public claimed;

    function setMerkleRoot(bytes32 _root) external {
        merkleRoot = _root;
    }

    function claim(bytes32[] calldata proof) external {
        require(!claimed[msg.sender], "Already claimed");
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(_verify(proof, leaf), "Invalid proof");
        claimed[msg.sender] = true;
        // ... mint or transfer
    }

    function _verify(bytes32[] calldata proof, bytes32 leaf) internal view returns (bool) {
        bytes32 hash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            hash = hash < proof[i] ? keccak256(abi.encodePacked(hash, proof[i])) : keccak256(abi.encodePacked(proof[i], hash));
        }
        return hash == merkleRoot;
    }
}
