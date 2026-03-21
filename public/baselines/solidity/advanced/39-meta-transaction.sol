// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Meta-Transaction (Safe)
 * @notice BASELINE: Relayer executes for user with signature
 * @dev SAFE: nonce + chainId + signer verification
 * METADATA: Category: advanced | Tier: advanced | Safe: true
 */
contract MetaTransaction {
    mapping(address => uint256) public nonces;

    function executeMetaTx(
        address user,
        bytes memory data,
        uint256 nonce,
        uint256 chainId,
        bytes memory signature
    ) external {
        require(nonce == nonces[user]++, "Invalid nonce");
        require(chainId == block.chainid, "Wrong chain");
        bytes32 hash = keccak256(abi.encodePacked(user, data, nonce, chainId, address(this)));
        bytes32 ethSigned = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        address signer = _recover(ethSigned, signature);
        require(signer == user, "Invalid signature");
        (bool ok,) = address(this).call(abi.encodePacked(data, user));
        require(ok);
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
