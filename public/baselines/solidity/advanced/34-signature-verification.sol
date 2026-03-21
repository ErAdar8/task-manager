// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Signature Verification (Safe)
 * @notice BASELINE: EOA recovery with nonce
 * @dev SAFE: nonce + chainId in hash
 * METADATA: Category: advanced | Tier: advanced | Safe: true
 */
contract SignatureVerification {
    mapping(address => uint256) public nonces;

    function executeWithSignature(
        address user,
        uint256 amount,
        uint256 nonce,
        uint256 chainId,
        bytes memory signature
    ) external {
        require(nonce == nonces[user], "Invalid nonce");
        bytes32 hash = keccak256(abi.encodePacked(user, amount, nonce, chainId));
        bytes32 ethSigned = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        address signer = _recover(ethSigned, signature);
        require(signer == user, "Invalid signature");
        nonces[user]++;
        // ... execute logic
    }

    function _recover(bytes32 hash, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65);
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        return ecrecover(hash, v, r, s);
    }
}
