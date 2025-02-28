// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "../Interfaces/IERC777Sender.sol";
import "../Interfaces/IERC1820Registry.sol";
import "./EIP777Token.sol";

contract MockERC777Sender is IERC777Sender {
    IERC1820Registry private constant _ERC1820_REGISTRY =
        IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    bool public shouldRevert;
    event TokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes userData,
        bytes operatorData
    );

    constructor() {
        // Register the contract as an ERC777 sender
        _ERC1820_REGISTRY.setInterfaceImplementer(
            address(this),
            keccak256("ERC777TokensSender"),
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