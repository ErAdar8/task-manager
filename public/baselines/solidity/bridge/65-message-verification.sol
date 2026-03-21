// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Cross-Chain Message Verification
 * @notice BASELINE: Secure message verification for bridges
 * @dev SAFE: Proper signature + nonce + chainId verification
 *
 * METADATA:
 * - Category: bridge
 * - Tier: advanced
 * - Safe: true
 * - Tags: ["cross-chain", "bridge", "signature", "message-verification"]
 */
contract CrossChainMessageVerification {
    address public trustedRelayer;
    mapping(uint256 => bool) public processedMessages;
    mapping(address => uint256) public nonces;

    event MessageProcessed(uint256 indexed messageId, address indexed user, bytes data);
    event MessageRejected(uint256 indexed messageId, string reason);

    constructor(address _trustedRelayer) {
        trustedRelayer = _trustedRelayer;
    }

    /**
     * @notice Process cross-chain message with full verification
     * @dev SAFE: Checks signature, nonce, chainId, replay protection
     */
    function processMessage(
        uint256 messageId,
        address user,
        bytes memory data,
        uint256 nonce,
        uint256 sourceChainId,
        bytes memory signature
    ) public {
        // 1. Check message not already processed (replay protection)
        require(!processedMessages[messageId], "Message already processed");

        // 2. Verify nonce (prevents replay across different messages)
        require(nonce == nonces[user], "Invalid nonce");

        // 3. Reconstruct message hash with all critical data
        bytes32 messageHash = keccak256(abi.encodePacked(
            messageId,
            user,
            data,
            nonce,
            sourceChainId,
            block.chainid  // Destination chain ID
        ));

        // 4. Verify signature from trusted relayer
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));

        address signer = recoverSigner(ethSignedMessageHash, signature);
        require(signer == trustedRelayer, "Invalid signature");

        // 5. Mark as processed BEFORE execution (reentrancy protection)
        processedMessages[messageId] = true;
        nonces[user]++;

        // 6. Execute message
        // In production: decode and execute data

        emit MessageProcessed(messageId, user, data);
    }

    /**
     * @notice Recover signer from signature
     */
    function recoverSigner(bytes32 ethSignedMessageHash, bytes memory signature)
        internal
        pure
        returns (address)
    {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    /**
     * @notice VULNERABLE VERSION (for comparison)
     * @dev DO NOT USE - Missing critical checks
     */
    function processMessageVulnerable(
        uint256 messageId,
        bytes memory data
    ) public {
        // MISSING: Signature verification
        // MISSING: Nonce check
        // MISSING: Chain ID verification
        // MISSING: Replay protection

        // This allows:
        // 1. Anyone to submit messages (no auth)
        // 2. Same message to be replayed
        // 3. Messages from other chains to be replayed here

        emit MessageProcessed(messageId, msg.sender, data);
    }
}