// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./TokenAVault.sol";

/**
 * @title BidirectionalPipe
 * @dev A bidirectional Pipe converts between an underlying asset and vault shares.
 *
 * This contract allows users to convert their underlying asset to vault shares (assetToShare)
 * and convert vault shares back to the underlying asset (shareToAsset). It interacts with the
 * vault to perform deposit (minting shares) and withdrawal (burning shares) operations.
 */
contract BidirectionalPipe {
    using SafeERC20 for IERC20;

    TokenAVault public vault;
    IERC20 public asset;
    IERC20 public share;

    /**
     * @dev Constructor.
     * @param vaultAddress The address of the ERC-7575 vault (e.g. TokenAVault).
     * @param assetAddress The address of the underlying asset.
     */
    constructor(address vaultAddress, address assetAddress) {
        vault = TokenAVault(vaultAddress);
        asset = IERC20(assetAddress);
        // Retrieve the external share token from the vault.
        share = IERC20(vault.share());
    }

    /**
     * @notice Converts underlying asset to vault shares.
     *
     * The caller sends the underlying asset to this Pipe.
     * The Pipe then approves the vault to spend the asset, calls deposit on the vault,
     * and finally transfers the minted shares to the caller.
     *
     * @param amount The amount of the underlying asset to convert.
     */
    function assetToShare(uint256 amount) external {
        // Transfer asset from the user to this Pipe.
        asset.safeTransferFrom(msg.sender, address(this), amount);
        // Approve the vault to spend the asset.
        require(asset.approve(address(vault), amount), "Approve failed");
        // Deposit asset into the vault; shares are minted to this Pipe.
        uint256 sharesReceived = vault.deposit(amount, address(this));
        // Transfer the vault shares to the user.
        share.safeTransfer(msg.sender, sharesReceived);
    }

    /**
     * @notice Converts vault shares to the underlying asset.
     *
     * The caller sends vault shares to this Pipe.
     * The Pipe then approves the vault to burn these shares, calls withdraw on the vault,
     * and finally transfers the underlying asset to the caller.
     *
     * @param amount The amount of vault shares to convert.
     */
    function shareToAsset(uint256 amount) external {
        // Transfer vault shares from the user to this Pipe.
        share.safeTransferFrom(msg.sender, address(this), amount);
        // Approve the vault to burn the shares.
        require(share.approve(address(vault), amount), "Approve failed");
        // Withdraw asset from the vault; this burns the shares held by the Pipe.
        uint256 assetReceived = vault.withdraw(amount, address(this), address(this));
        // Transfer the underlying asset to the user.
        asset.safeTransfer(msg.sender, assetReceived);
    }
}
