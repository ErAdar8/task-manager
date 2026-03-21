// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

- @title Missing Access Control
- @notice BASELINE: Common vulnerability - missing access control
- @dev Score: 0/100 (vulnerable)
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: false
- - Immunefi Level: 5 (Critical)
- - Common Finding: 20% of Immunefi reports
    */
    contract AccessControlMissing {
    address public owner;
    uint256 public fee;
    bool public paused;
        constructor() {
            owner = msg.sender;
            fee = 10;
        }

        /**
         * @notice VULNERABLE: No access control - anyone can become owner!
         */
        function setOwner(address newOwner) public {
            owner = newOwner;
        }

        /**
         * @notice VULNERABLE: Anyone can drain the contract
         */
        function withdrawAll() public {
            payable(msg.sender).transfer(address(this).balance);
        }

        /**
         * @notice VULNERABLE: Anyone can change fee to 0 or 100%
         */
        function setFee(uint256 newFee) public {
            fee = newFee;
        }

        /**
         * @notice VULNERABLE: Anyone can pause
         */
        function setPaused(bool _paused) public {
            paused = _paused;
        }

        receive() external payable {}
    }