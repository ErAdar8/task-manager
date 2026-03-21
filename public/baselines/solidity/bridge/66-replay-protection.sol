// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Replay Protection for Bridges
 * @notice BASELINE: Multiple replay protection mechanisms
 * @dev SAFE: Nonce + messageId + chainId + deadline
 *
 * ATTACK VECTORS PREVENTED:
 * 1. Same-chain replay: Use messageId bitmap
 * 2. Cross-chain replay: Include both source & destination chainId
 * 3. Time-delayed replay: Use deadline
 * 4. Nonce reuse: Per-user nonce tracking
 *
 * METADATA:
 * - Category: bridge
 * - Tier: advanced
 * - Safe: true
 * - Tags: ["replay-protection", "bridge", "security"]
 */
contract ReplayProtection {
    // Bitmap for processed message IDs (gas-efficient)
    mapping(uint256 => uint256) private _processedMessageBitmap;

    // Per-user nonce for ordered messages
    mapping(address => uint256) public nonces;

    // Source chain ID → destination chain ID → valid
    mapping(uint256 => mapping(uint256 => bool)) public validChainPairs;

    address public trustedValidator;

    event MessageProcessed(
        uint256 indexed messageId,
        address indexed user,
        uint256 sourceChain,
        uint256 destinationChain
    );

    constructor(address _validator) {
        trustedValidator = _validator;

        // Setup valid chain pairs
        validChainPairs[1][137] = true;  // Ethereum → Polygon
        validChainPairs[137][1] = true;  // Polygon → Ethereum
    }

    /**
     * @notice Process message with comprehensive replay protection
     */
    function processMessage(
        uint256 messageId,
        address user,
        bytes memory data,
        uint256 nonce,
        uint256 sourceChainId,
        uint256 deadline,
        bytes memory signature
    ) public {
        // 1. REPLAY PROTECTION: Check message not processed
        require(!isMessageProcessed(messageId), "Message already processed");

        // 2. NONCE CHECK: Prevent out-of-order execution
        require(nonce == nonces[user], "Invalid nonce");

        // 3. CHAIN ID VERIFICATION: Prevent cross-chain replay
        require(validChainPairs[sourceChainId][block.chainid], "Invalid chain pair");
        require(sourceChainId != block.chainid, "Same chain not allowed");

        // 4. DEADLINE CHECK: Prevent time-delayed replay
        require(block.timestamp <= deadline, "Message expired");
        require(deadline <= block.timestamp + 1 hours, "Deadline too far");

        // 5. SIGNATURE VERIFICATION
        bytes32 messageHash = keccak256(abi.encodePacked(
            messageId,
            user,
            data,
            nonce,
            sourceChainId,
            block.chainid,
            deadline
        ));

        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));

        require(recoverSigner(ethSignedHash, signature) == trustedValidator, "Invalid signature");

        // 6. MARK AS PROCESSED (before execution)
        _setMessageProcessed(messageId);
        nonces[user]++;

        // 7. Execute message
        // ... execution logic ...

        emit MessageProcessed(messageId, user, sourceChainId, block.chainid);
    }

    /**
     * @notice Check if message was processed (bitmap method - gas efficient)
     */
    function isMessageProcessed(uint256 messageId) public view returns (bool) {
        uint256 bucket = messageId / 256;
        uint256 position = messageId % 256;
        uint256 mask = 1 << position;

        return (_processedMessageBitmap[bucket] & mask) != 0;
    }

    /**
     * @notice Mark message as processed
     */
    function _setMessageProcessed(uint256 messageId) private {
        uint256 bucket = messageId / 256;
        uint256 position = messageId % 256;
        uint256 mask = 1 << position;

        _processedMessageBitmap[bucket] |= mask;
    }

    function recoverSigner(bytes32 ethSignedMessageHash, bytes memory signature)
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

        return ecrecover(ethSignedMessageHash, v, r, s);
    }
}