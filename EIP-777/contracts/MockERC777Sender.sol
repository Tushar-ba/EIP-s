// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "../Interfaces/IERC777Sender.sol";
import "../Interfaces/IERC777Recipient.sol";
import "../Interfaces/IERC1820Registry.sol";
import "./EIP777Token.sol";

contract MockERC777Sender is IERC777Sender, IERC777Recipient {
    IERC1820Registry private _ERC1820_REGISTRY; // Made non-constant

    bool public shouldRevert;
    event TokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes userData,
        bytes operatorData
    );
    event TokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes userData,
        bytes operatorData
    );

    constructor(address registryAddress) {
        _ERC1820_REGISTRY = IERC1820Registry(registryAddress);
        _ERC1820_REGISTRY.setInterfaceImplementer(
            address(this),
            keccak256("ERC777TokensSender"),
            address(this)
        );
        _ERC1820_REGISTRY.setInterfaceImplementer(
            address(this),
            keccak256("ERC777TokensRecipient"),
            address(this)
        );
    }

    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {
        require(!shouldRevert, "MockERC777Sender: Reverting");
        emit TokensToSend(operator, from, to, amount, userData, operatorData);
    }

    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {
        require(!shouldRevert, "MockERC777Sender: Reverting");
        emit TokensReceived(operator, from, to, amount, userData, operatorData);
    }

    function sendTokens(
        address tokenAddress,
        address to,
        uint256 amount
    ) external {
        EIP777Token(tokenAddress).send(to, amount, "0x");
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }
}