// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "../Interfaces/IERC777Recipient.sol";
import "../Interfaces/IERC1820Registry.sol";

contract MockERC777Recipient is IERC777Recipient {
    IERC1820Registry private constant _ERC1820_REGISTRY =
        IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    bool public shouldRevert;
    event TokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes userData,
        bytes operatorData
    );

    constructor() {
        // Register the contract as an ERC777 recipient
        _ERC1820_REGISTRY.setInterfaceImplementer(
            address(this),
            keccak256("ERC777TokensRecipient"),
            address(this)
        );
    }

    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {
        require(!shouldRevert, "MockERC777Recipient: Reverting");
        emit TokensReceived(operator, from, to, amount, userData, operatorData);
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }
}
