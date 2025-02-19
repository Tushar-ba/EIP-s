// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "../Interfaces/IEIP7575.sol";

/**
 * @title TokenAVault
 * @dev An ERC-7575 Vault for a specific asset (TokenA).
 *
 * This vault implements the deposit/withdraw logic (similar to ERC-4626) but does not itself act as an ERC-20.
 * Instead, it uses an external share token (e.g. deployed via Share.sol).
 *
 * When a user deposits TokenA, the vault transfers in the tokens and calls the external share contract’s mint
 * function to credit the user with vault shares (using a simple 1:1 conversion).
 *
 * On withdrawal, it burns shares via the external share token’s burn function and transfers TokenA out.
 *
 * ERC-165:
 * Returns true for interface ID 0x2f0a18c5 (indicating ERC-7575 vault compliance) and the ERC-165 interface ID.
 */
contract TokenAVault is ERC165, IEIP7575 {
    using SafeERC20 for IERC20;

    /// @notice The underlying asset (TokenA) of the vault.
    IERC20 public immutable asset;

    /// @notice The external share token contract address.
    address public override share;

    /// @notice Total underlying assets deposited.
    uint256 public totalAssets;

    event Deposit(address indexed caller, address indexed receiver, uint256 assets, uint256 shares);
    event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);

    /**
     * @dev Constructor.
     * @param _asset The underlying ERC20 asset (TokenA).
     * @param _share The address of the external share token.
     */
    constructor(IERC20 _asset, address _share) {
        asset = _asset;
        share = _share;
    }

    /**
     * @notice Deposits a specified amount of TokenA into the vault.
     * Mints vault shares to the receiver via the external share token (1:1 conversion).
     * @param assets The amount of TokenA to deposit.
     * @param receiver The address to receive the vault shares.
     * @return sharesMinted The number of shares minted (equals assets).
     */
    function deposit(uint256 assets, address receiver) external returns (uint256 sharesMinted) {
        asset.safeTransferFrom(msg.sender, address(this), assets);
        (bool success, ) = share.call(abi.encodeWithSignature("mint(address,uint256)", receiver, assets));
        require(success, "Mint failed");
        totalAssets += assets;
        emit Deposit(msg.sender, receiver, assets, assets);
        return assets;
    }

    /**
     * @notice Withdraws a specified amount of TokenA from the vault.
     * Burns vault shares from the owner via the external share token (1:1 conversion).
     * @param assets The amount of TokenA to withdraw.
     * @param receiver The address to receive TokenA.
     * @param owner_ The address whose shares are burned.
     * @return sharesBurned The number of shares burned (equals assets).
     */
    function withdraw(uint256 assets, address receiver, address owner_) external returns (uint256 sharesBurned) {
        (bool success, ) = share.call(abi.encodeWithSignature("burn(address,uint256)", owner_, assets));
        require(success, "Burn failed");
        totalAssets -= assets;
        asset.safeTransfer(receiver, assets);
        emit Withdraw(msg.sender, receiver, owner_, assets, assets);
        return assets;
    }

    /**
     * @notice ERC-165 supportsInterface implementation.
     * Returns true for 0x2f0a18c5 (ERC-7575 Vault interface) and the ERC-165 interface.
     */
    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == 0x2f0a18c5 || interfaceId == type(IERC165).interfaceId;
    }
}
