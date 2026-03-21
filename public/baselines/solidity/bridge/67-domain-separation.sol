// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Domain Separation for Bridges
 * @notice BASELINE: EIP-712 domain separation for cross-chain messages
 * @dev SAFE: Proper domain separator prevents signature reuse
 *
 * PREVENTS:
 * 1. Signature replay across different contracts
 * 2. Signature replay across different chains
 * 3. Signature replay in different versions
 *
 * METADATA:
 * - Category: bridge
 * - Tier: advanced
 * - Safe: true
 * - Standard: EIP-712
 * - Tags: ["domain-separation", "eip712", "bridge"]
 */
contract DomainSeparation {
    // EIP-712 Domain Separator
    bytes32 public DOMAIN_SEPARATOR;

    // Type hashes for different message types
    bytes32 public constant BRIDGE_MESSAGE_TYPEHASH = keccak256(
        "BridgeMessage(uint256 messageId,address user,bytes data,uint256 nonce,uint256 sourceChain,uint256 deadline)"
    );

    mapping(uint256 => bool) public processedMessages;
    mapping(address => uint256) public nonces;

    address public trustedRelayer;

    event MessageProcessed(uint256 indexed messageId, address indexed user);

    constructor(address _relayer, string memory version) {
        trustedRelayer = _relayer;

        // Build EIP-712 domain separator
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("CrossChainBridge")),
            keccak256(bytes(version)),
            block.chainid,
            address(this)
        ));
    }

    /**
     * @notice Process message with EIP-712 domain separation
     * @dev SAFE: Signature cannot be reused across contracts/chains/versions
     */
    function processMessage(
        uint256 messageId,
        address user,
        bytes memory data,
        uint256 nonce,
        uint256 sourceChain,
        uint256 deadline,
        bytes memory signature
    ) public {
        require(!processedMessages[messageId], "Already processed");
        require(nonce == nonces[user], "Invalid nonce");
        require(block.timestamp <= deadline, "Expired");

        // 1. Build structured data hash (EIP-712)
        bytes32 structHash = keccak256(abi.encode(
            BRIDGE_MESSAGE_TYPEHASH,
            messageId,
            user,
            keccak256(data),
            nonce,
            sourceChain,
            deadline
        ));

        // 2. Combine with domain separator
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",  // EIP-712 prefix
            DOMAIN_SEPARATOR,
            structHash
        ));

        // 3. Verify signature
        address signer = recoverSigner(digest, signature);
        require(signer == trustedRelayer, "Invalid signature");

        // 4. Process
        processedMessages[messageId] = true;
        nonces[user]++;

        emit MessageProcessed(messageId, user);
    }

    /**
     * @notice VULNERABLE VERSION (no domain separation)
     * @dev Signature can be replayed across contracts/chains
     */
    function processMessageVulnerable(
        uint256 messageId,
        bytes memory data,
        bytes memory signature
    ) public {
        // VULNERABLE: No domain separator
        // Same signature can be used on:
        // - Different contract addresses
        // - Different chains
        // - Different versions

        bytes32 messageHash = keccak256(abi.encodePacked(messageId, data));

        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));

        address signer = recoverSigner(ethSignedHash, signature);
        require(signer == trustedRelayer, "Invalid signature");

        // Vulnerable to replay!
    }

    function recoverSigner(bytes32 hash, bytes memory signature)
        internal
        pure
        returns (address)
    {
        require(signature.length == 65);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        return ecrecover(hash, v, r, s);
    }

    /**
     * @notice Get domain separator for off-chain signing
     */
    function getDomainSeparator() public view returns (bytes32) {
        return DOMAIN_SEPARATOR;
    }

    /**
     * @notice Helper for off-chain: get message hash for signing
     */
    function getMessageHash(
        uint256 messageId,
        address user,
        bytes memory data,
        uint256 nonce,
        uint256 sourceChain,
        uint256 deadline
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            BRIDGE_MESSAGE_TYPEHASH,
            messageId,
            user,
            keccak256(data),
            nonce,
            sourceChain,
            deadline
        ));

        return keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            structHash
        ));
    }
}