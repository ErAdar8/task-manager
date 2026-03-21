// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

- @title Simple Multisig Wallet
- @notice BASELINE: Basic multisig pattern
- @dev Requires M-of-N signatures for execution
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: true
- - Tags: ["multisig", "governance"]
    */
    contract MultiSigWallet {
    address[] public owners;
    uint256 public required;
    uint256 public transactionCount;
        mapping(uint256 => Transaction) public transactions;
        mapping(uint256 => mapping(address => bool)) public confirmations;

        struct Transaction {
            address to;
            uint256 value;
            bytes data;
            bool executed;
            uint256 confirmationCount;
        }

        event Submission(uint256 indexed transactionId);
        event Confirmation(address indexed sender, uint256 indexed transactionId);
        event Execution(uint256 indexed transactionId);

        modifier onlyOwner() {
            bool isOwner = false;
            for (uint256 i = 0; i < owners.length; i++) {
                if (owners[i] == msg.sender) {
                    isOwner = true;
                    break;
                }
            }
            require(isOwner, "Not an owner");
            _;
        }

        modifier notExecuted(uint256 transactionId) {
            require(!transactions[transactionId].executed, "Already executed");
            _;
        }

        constructor(address[] memory _owners, uint256 _required) {
            require(_owners.length > 0, "Owners required");
            require(_required > 0 && _required <= _owners.length, "Invalid required");

            owners = _owners;
            required = _required;
        }

        function submitTransaction(address to, uint256 value, bytes memory data)
            public
            onlyOwner
            returns (uint256)
        {
            uint256 transactionId = transactionCount++;
            transactions[transactionId] = Transaction({
                to: to,
                value: value,
                data: data,
                executed: false,
                confirmationCount: 0
            });
            emit Submission(transactionId);
            confirmTransaction(transactionId);
            return transactionId;
        }

        function confirmTransaction(uint256 transactionId)
            public
            onlyOwner
            notExecuted(transactionId)
        {
            require(!confirmations[transactionId][msg.sender], "Already confirmed");

            confirmations[transactionId][msg.sender] = true;
            transactions[transactionId].confirmationCount++;
            emit Confirmation(msg.sender, transactionId);

            if (transactions[transactionId].confirmationCount >= required) {
                executeTransaction(transactionId);
            }
        }

        function executeTransaction(uint256 transactionId)
            public
            notExecuted(transactionId)
        {
            Transaction storage txn = transactions[transactionId];
            require(txn.confirmationCount >= required, "Not enough confirmations");

            txn.executed = true;
            (bool success, ) = txn.to.call{value: txn.value}(txn.data);
            require(success, "Execution failed");

            emit Execution(transactionId);
        }

        receive() external payable {}
    }