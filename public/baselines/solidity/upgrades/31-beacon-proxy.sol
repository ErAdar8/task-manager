// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Beacon Proxy Pattern
 * @notice BASELINE: Single beacon, many proxies
 * @dev SAFE: Implementation read from beacon
 * METADATA: Category: upgrades | Tier: advanced | Safe: true
 */
contract BeaconProxy {
    address immutable beacon;

    constructor(address _beacon) {
        beacon = _beacon;
    }

    function _implementation() internal view returns (address) {
        (bool ok, bytes memory data) = beacon.staticcall(abi.encodeWithSignature("implementation()"));
        require(ok && data.length >= 32, "Beacon not contract");
        return abi.decode(data, (address));
    }

    fallback() external payable {
        _delegate(_implementation());
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
