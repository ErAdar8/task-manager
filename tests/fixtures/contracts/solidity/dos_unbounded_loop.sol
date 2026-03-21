// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Intentionally vulnerable: unbounded loop over dynamic array (line 26).
 * If payees.length is large, distribute() can exceed block gas and DoS.
 * Analyzer should report DoS / unbounded loop with exact line of the loop.
 */
contract DoSUnboundedLoop {
    address[] public payees;
    mapping(address => uint256) public shares;

    function addPayee(address payee, uint256 share) external {
        payees.push(payee);
        shares[payee] = share;
    }

    function distribute() external {
        for (uint256 i = 0; i < payees.length; i++) {
            address payee = payees[i];
            uint256 amount = shares[payee];
            if (amount > 0) {
                shares[payee] = 0;
                (bool ok, ) = payee.call{value: amount}("");
                require(ok);
            }
        }
    }

    receive() external payable {}
}
