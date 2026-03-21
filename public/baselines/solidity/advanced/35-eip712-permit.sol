// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title EIP-712 Permit (Safe)
 * @notice BASELINE: Typed structured data signing
 * @dev SAFE: DOMAIN_SEPARATOR + typehash
 * METADATA: Category: advanced | Tier: advanced | Safe: true
 */
contract EIP712Permit {
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    mapping(address => uint256) public nonces;

    constructor() {
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("Token")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }

    function permit(address owner, address spender, uint256 value, uint256 deadline, bytes memory signature) external {
        require(block.timestamp <= deadline, "Expired");
        uint256 nonce = nonces[owner]++;
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonce, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address signer = _recover(digest, signature);
        require(signer == owner, "Invalid permit");
        // ... apply allowance
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
