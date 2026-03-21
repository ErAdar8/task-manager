// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**

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
    */

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