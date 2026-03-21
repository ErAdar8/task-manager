// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

- @title ERC721 Safe Implementation
- @notice BASELINE: Simplified OpenZeppelin ERC721
-
- METADATA:
- - Category: tokens
- - Tier: core
- - Safe: true
- - Standard: ERC721
    */
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