// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Basic Staking Contract
 * @notice BASELINE: Simple staking with rewards
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: true
 * - Tags: ["staking", "rewards"]
 */
contract StakingBasic {
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public stakingTimestamp;
    mapping(address => uint256) public rewards;

    uint256 public rewardRate = 10; // 10% per year (simplified)
    uint256 public constant YEAR = 365 days;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);

    function stake() public payable {
        require(msg.value > 0, "Must stake > 0");

        // Claim pending rewards first
        if (stakes[msg.sender] > 0) {
            _updateRewards(msg.sender);
        }

        stakes[msg.sender] += msg.value;
        stakingTimestamp[msg.sender] = block.timestamp;

        emit Staked(msg.sender, msg.value);
    }

    function unstake(uint256 amount) public {
        require(stakes[msg.sender] >= amount, "Insufficient stake");

        // Update rewards before unstaking
        _updateRewards(msg.sender);

        stakes[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);

        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() public {
        _updateRewards(msg.sender);

        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards");

        rewards[msg.sender] = 0;
        payable(msg.sender).transfer(reward);

        emit RewardClaimed(msg.sender, reward);
    }

    function _updateRewards(address user) internal {
        uint256 stakingDuration = block.timestamp - stakingTimestamp[user];
        uint256 reward = (stakes[user] * rewardRate * stakingDuration) / (100 * YEAR);

        rewards[user] += reward;
        stakingTimestamp[user] = block.timestamp;
    }

    function calculatePendingReward(address user) public view returns (uint256) {
        uint256 stakingDuration = block.timestamp - stakingTimestamp[user];
        return (stakes[user] * rewardRate * stakingDuration) / (100 * YEAR);
    }

    receive() external payable {}
}