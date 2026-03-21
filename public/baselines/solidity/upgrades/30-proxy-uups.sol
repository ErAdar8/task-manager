// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title UUPS Upgradeable Proxy
 * @notice BASELINE: Upgrade logic in implementation
 * @dev SAFE: upgradeTo only callable via implementation with proper auth
 * METADATA: Category: upgrades | Tier: advanced | Safe: true
 */
abstract contract UUPSUpgradeable {
    address public implementation;
    address private _admin;

    event Upgraded(address indexed implementation);

    modifier onlyProxy() {
        require(address(this) != implementation, "Must be delegatecall");
        _;
    }

    function _authorizeUpgrade(address newImplementation) internal virtual;

    function upgradeTo(address newImplementation) external onlyProxy {
        _authorizeUpgrade(newImplementation);
        implementation = newImplementation;
        emit Upgraded(newImplementation);
    }

    fallback() external payable {
        _delegate(implementation);
    }

    function _delegate(address impl) internal {
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
