// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEIP7575
 * @dev Interface for ERC-7575 Vaults.
 *
 * ERC-7575 Vaults must implement the ERC-4626 deposit/mint/withdraw/redeem logic (excluding ERC-20 methods)
 * and expose an external share token via the `share()` method.
 */
interface IEIP7575 {
    /**
     * @notice Returns the address of the share token.
     * The share token represents the vault’s shares.
     */
    function share() external view returns (address);
}
