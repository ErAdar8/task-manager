// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Timelock Controller
 * @notice BASELINE: Delayed execution for governance
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: true
 * - Tags: ["timelock", "governance", "security"]
 */
contract TimelockController {
    uint256 public constant MIN_DELAY = 2 days;
    uint256 public constant MAX_DELAY = 30 days;

    uint256 public delay = 2 days;
    address public admin;

    mapping(bytes32 => uint256) public queuedTransactions;

    event TransactionQueued(bytes32 indexed txHash, address target, uint256 value, bytes data, uint256 eta);
    event TransactionExecuted(bytes32 indexed txHash, address target, uint256 value, bytes data);
    event TransactionCancelled(bytes32 indexed txHash);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Queue a transaction for future execution
     */
    function queueTransaction(
        address target,
        uint256 value,
        bytes memory data
    ) public onlyAdmin returns (bytes32) {
        uint256 eta = block.timestamp + delay;

        bytes32 txHash = keccak256(abi.encode(target, value, data, eta));

        queuedTransactions[txHash] = eta;

        emit TransactionQueued(txHash, target, value, data, eta);
        return txHash;
    }

    /**
     * @notice Execute a queued transaction after delay
     */
    function executeTransaction(
        address target,
        uint256 value,
        bytes memory data,
        uint256 eta
    ) public payable onlyAdmin returns (bytes memory) {
        bytes32 txHash = keccak256(abi.encode(target, value, data, eta));

        require(queuedTransactions[txHash] != 0, "Transaction not queued");
        require(block.timestamp >= eta, "Transaction not ready");
        require(block.timestamp <= eta + 7 days, "Transaction expired");

        queuedTransactions[txHash] = 0;

        (bool success, bytes memory returnData) = target.call{value: value}(data);
        require(success, "Transaction execution failed");

        emit TransactionExecuted(txHash, target, value, data);
        return returnData;
    }

    /**
     * @notice Cancel a queued transaction
     */
    function cancelTransaction(
        address target,
        uint256 value,
        bytes memory data,
        uint256 eta
    ) public onlyAdmin {
        bytes32 txHash = keccak256(abi.encode(target, value, data, eta));

        require(queuedTransactions[txHash] != 0, "Transaction not queued");

        queuedTransactions[txHash] = 0;

        emit TransactionCancelled(txHash);
    }

    receive() external payable {}
}