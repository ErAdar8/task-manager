// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

- @title Mintable Token (Safe)
- @notice BASELINE: Token with access-controlled minting
-
- METADATA:
- - Category: tokens
- - Tier: core
- - Safe: true
- - Tags: ["mintable", "access-control"]
    */
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