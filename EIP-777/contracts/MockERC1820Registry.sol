// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "../Interfaces/IERC1820Registry.sol";

/**
 * @title MockERC1820Registry
 * @dev A minimal implementation of the ERC1820 Registry for testing purposes.
 */
contract MockERC1820Registry is IERC1820Registry {
    mapping(address => mapping(bytes32 => address)) private interfaces;

    function setInterfaceImplementer(
        address account,
        bytes32 interfaceHash,
        address implementer
    ) external override {
        interfaces[account][interfaceHash] = implementer;
    }

    function getInterfaceImplementer(
        address account,
        bytes32 interfaceHash
    ) external view override returns (address) {
        return interfaces[account][interfaceHash];
    }
}
