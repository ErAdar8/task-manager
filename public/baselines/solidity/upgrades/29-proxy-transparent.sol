// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Transparent Proxy Pattern
 * @notice BASELINE: Admin/logic separation for upgrades
 * @dev SAFE: Proxy delegates to implementation, admin only for upgrades
 * METADATA: Category: upgrades | Tier: advanced | Safe: true
 */
contract TransparentProxy {
    address public implementation;
    address public admin;

    constructor(address _implementation) {
        implementation = _implementation;
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    function upgradeTo(address _newImpl) external onlyAdmin {
        implementation = _newImpl;
    }

    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
