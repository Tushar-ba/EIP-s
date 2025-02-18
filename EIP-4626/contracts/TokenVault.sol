// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title BasicYieldVault
 * @notice A simple implementation of EIP-4626 to demonstrate vault mechanics
 * @dev This vault simulates yield generation through a mock strategy
 */
contract BasicYieldVault is ERC4626 {
    using Math for uint256;

    // Track our last yield generation timestamp
    uint256 private lastYieldTimestamp;
    
    // Mock yield rate (1% per day, scaled by 1e18)
    uint256 private constant DAILY_YIELD = 0.01e18;

    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) ERC4626(asset_) {
        lastYieldTimestamp = block.timestamp;
    }

    /**
     * @notice Calculate the total assets in the vault, including simulated yield
     * @dev Overrides the base ERC4626 totalAssets function to include generated yield
     * @return The total asset amount
     */
    function totalAssets() public view virtual override returns (uint256) {
        // Get the base asset amount
        uint256 baseAssets = super.totalAssets();
        
        // If we have no assets, return 0
        if (baseAssets == 0) return 0;
        
        // Calculate days elapsed since last yield
        uint256 daysElapsed = (block.timestamp - lastYieldTimestamp) / 1 days;
        
        // Calculate accumulated yield
        uint256 yield = baseAssets * DAILY_YIELD * daysElapsed / 1e18;
        
        return baseAssets + yield;
    }

    /**
     * @notice Deposit assets into the vault and receive shares
     * @dev Overrides the base deposit function to update yield tracking
     * @param assets Amount of assets to deposit
     * @param receiver Address that will receive the shares
     * @return shares Amount of shares minted
     */
    function deposit(uint256 assets, address receiver) public virtual override returns (uint256) {
        // Update yield before modifying balances
        _updateYield();
        return super.deposit(assets, receiver);
    }

    /**
     * @notice Withdraw assets from the vault by burning shares
     * @dev Overrides the base withdraw function to update yield tracking
     * @param assets Amount of assets to withdraw
     * @param receiver Address that will receive the assets
     * @param owner Address that owns the shares to be burned
     * @return shares Amount of shares burned
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual override returns (uint256) {
        _updateYield();
        return super.withdraw(assets, receiver, owner);
    }

    /**
     * @dev Internal function to update the vault's yield
     * This simulates yield generation in a real strategy
     */
    function _updateYield() internal {
        uint256 currentAssets = super.totalAssets();
        if (currentAssets > 0) {
            uint256 daysElapsed = (block.timestamp - lastYieldTimestamp) / 1 days;
            if (daysElapsed > 0) {
                uint256 yieldAmount = currentAssets * DAILY_YIELD * daysElapsed / 1e18;
                // In a real implementation, this would come from a yield strategy
                // For this POC, we're minting new tokens to simulate yield
                _mint(address(this), yieldAmount);
                lastYieldTimestamp = block.timestamp;
            }
        }
    }
}

/**
 * @title MockToken
 * @notice A simple ERC20 token for testing the vault
 */
contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }
}