// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DoS via Unbounded Loop
 * @notice BASELINE: Classic gas DoS vulnerability
 * @dev Score: 0/100 (vulnerable)
 *
 * METADATA:
 * - Category: gas
 * - Tier: core
 * - Safe: false
 * - Immunefi Level: 3 (Medium)
 * - Common Finding: 8% of Immunefi reports
 */
contract DosUnboundedLoop {
    address[] public recipients;
    uint256 public rewardPerRecipient = 1 ether;

    event RecipientAdded(address recipient);
    event RewardDistributed(address recipient, uint256 amount);

    function addRecipient(address recipient) public {
        recipients.push(recipient);
        emit RecipientAdded(recipient);
    }

    /**
     * @notice VULNERABLE: Unbounded loop
     * @dev If recipients.length > ~500-1000, likely out of gas
     *
     * EXPLOIT:
     * 1. Attacker adds 10,000 recipients
     * 2. distributeRewards() tries to loop through all
     * 3. Runs out of gas, function always fails
     * 4. Rewards can never be distributed (DoS)
     */
    function distributeRewardsVulnerable() public {
        for (uint256 i = 0; i < recipients.length; i++) {
            payable(recipients[i]).transfer(rewardPerRecipient);
            emit RewardDistributed(recipients[i], rewardPerRecipient);
        }
    }

    /**
     * @notice SAFE: Batch processing with limits
     * @dev Process in chunks to avoid gas limit
     */
    function distributeBatch(uint256 startIndex, uint256 count) public {
        uint256 end = startIndex + count;
        require(end <= recipients.length, "Out of bounds");
        require(count <= 100, "Batch too large");  // Max 100 per tx

        for (uint256 i = startIndex; i < end; i++) {
            payable(recipients[i]).transfer(rewardPerRecipient);
            emit RewardDistributed(recipients[i], rewardPerRecipient);
        }
    }

    /**
     * @notice BETTER: Pull payment pattern
     * @dev Let users claim their own rewards
     */
    mapping(address => uint256) public pendingRewards;

    function markRewardsReady() public {
        for (uint256 i = 0; i < recipients.length; i++) {
            pendingRewards[recipients[i]] = rewardPerRecipient;
        }
    }

    function claimReward() public {
        uint256 reward = pendingRewards[msg.sender];
        require(reward > 0, "No reward");
        pendingRewards[msg.sender] = 0;
        payable(msg.sender).transfer(reward);
    }

    receive() external payable {}
}