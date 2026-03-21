// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

- @title Safe External Call Handling
- @notice BASELINE: Proper external call patterns
- @dev Score: 100/100
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: true
- - Tags: ["external-calls", "error-handling"]
    */
    contract SafeExternalCall {
        event TransferSuccess(address to, uint256 amount);
        event TransferFailed(address to, uint256 amount);

        /**
         * @notice SAFE: Checks return value of low-level call
         */
        function safeCallTransfer(address payable recipient, uint256 amount) public {
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "Transfer failed");
            emit TransferSuccess(recipient, amount);
        }

        /**
         * @notice SAFE: Uses transfer() which reverts on failure
         */
        function saferTransfer(address payable recipient, uint256 amount) public {
            recipient.transfer(amount);
            emit TransferSuccess(recipient, amount);
        }

        /**
         * @notice SAFE: Batch transfers with proper error handling
         */
        function batchTransfer(address payable[] memory recipients, uint256[] memory amounts) public {
            require(recipients.length == amounts.length, "Length mismatch");

            for (uint256 i = 0; i < recipients.length; i++) {
                (bool success, ) = recipients[i].call{value: amounts[i]}("");
                if (success) {
                    emit TransferSuccess(recipients[i], amounts[i]);
                } else {
                    emit TransferFailed(recipients[i], amounts[i]);
                }
            }
        }

        /**
         * @notice SAFE: Try-catch for contract calls
         */
        function safeContractCall(address target, bytes memory data) public returns (bool) {
            (bool success, ) = target.call(data);
            return success;
        }

        receive() external payable {}
    }