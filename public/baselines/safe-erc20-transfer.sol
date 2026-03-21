// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// REFERENCE: SafeERC20 usage
// Use this as baseline for ERC20 interaction checks

contract SafeERC20Pattern {
    using SafeERC20 for IERC20;

    // SAFE PATTERN: Using SafeERC20 for all transfers
    function safeTransfer(
        IERC20 token,
        address to,
        uint256 amount
    ) public {
        token.safeTransfer(to, amount);
    }
}
