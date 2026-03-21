// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

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
    */
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