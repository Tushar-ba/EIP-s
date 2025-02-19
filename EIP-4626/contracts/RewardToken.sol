// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title RewardToken
/// @notice A simple ERC20 token that will be minted as yield rewards.
/// The vault (which becomes the owner) is allowed to mint new tokens.
contract RewardToken is ERC20, Ownable {
    constructor() ERC20("Reward Token", "RWD") Ownable(msg.sender){}

    /// @notice Mint reward tokens.
    /// @dev Only the owner (the vault) may mint.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
