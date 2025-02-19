// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/**
 * @title Share
 * @dev External ERC20 share token for ERC-7575 Vaults.
 *
 * This token “externalizes” the ERC-20 functionality from the vault.
 * It also maintains a mapping (vault) that enables a share-to‑vault lookup.
 *
 * It emits a VaultUpdate event when the vault associated with a given asset is updated.
 */
contract Share is ERC20, ERC165 {
    // Mapping from underlying asset address to the vault address.
    mapping(address => address) public vault;

    event VaultUpdate(address indexed asset, address vault);

    /**
     * @dev Constructor.
     * @param name_ The name of the share token.
     * @param symbol_ The symbol of the share token.
     */
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    /**
     * @notice Updates the vault for a given asset.
     * @param asset The underlying asset address.
     * @param vault_ The vault address.
     */
    function updateVault(address asset, address vault_) public {
        vault[asset] = vault_;
        emit VaultUpdate(asset, vault_);
    }

    /**
     * @notice ERC-165 support.
     * Returns true for interface id 0xf815c03d (ERC-7575 share interface) or for ERC-165.
     */
    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == 0xf815c03d || interfaceId == type(IERC165).interfaceId;
    }

    // --- External mint/burn functions ---
    // In production these functions should include access control (e.g. only the vault can call them).

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}
