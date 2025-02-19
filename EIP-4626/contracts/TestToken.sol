// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title TestToken
/// @notice A simple ERC20 token that serves as the underlying asset for the vault.
contract TestToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Test Token", "TST") {
        _mint(msg.sender, initialSupply);
    }
}
