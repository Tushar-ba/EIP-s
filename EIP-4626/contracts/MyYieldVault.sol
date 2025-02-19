// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {RewardToken} from "./RewardToken.sol";

/// @title MyYieldVault
/// @notice An ERC4626 vault that distributes yield (in the form of RewardToken)
/// to depositors based on the time they remain in the vault.
/// Users deposit an underlying asset and receive vault shares (MVT).
contract MyYieldVault is ERC20, ERC4626, Ownable {
    using SafeERC20 for IERC20;

    // --- Reward Accounting Variables ---
    // Scaled by 1e12 for precision.
    uint256 public accRewardPerShare;
    uint256 public lastRewardTimestamp;
    uint256 public rewardRate;
    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public pendingRewards;

    // The reward token (RWD) that is minted as yield.
    RewardToken public rewardToken;

    event RewardClaimed(address indexed user, uint256 amount);

    constructor(
        IERC20 asset_,
        RewardToken rewardToken_,
        uint256 rewardRate_
    )
        ERC20("My Vault Token", "MVT")   // Initializes ERC20 with name and symbol.
        ERC4626(asset_)                  // Initializes ERC4626 with the underlying asset.
        Ownable(msg.sender)               // Sets deployer as initial owner.
    {
        rewardToken = rewardToken_;
        rewardRate = rewardRate_;
        lastRewardTimestamp = block.timestamp;
    }

    // Resolve decimals() conflict between ERC20 and ERC4626.
    function decimals() public view virtual override(ERC20, ERC4626) returns (uint8) {
        return ERC20.decimals();
    }

    function updatePool() public {
        if (block.timestamp <= lastRewardTimestamp) {
            return;
        }
        uint256 supply = totalSupply();
        if (supply == 0) {
            lastRewardTimestamp = block.timestamp;
            return;
        }
        uint256 timeElapsed = block.timestamp - lastRewardTimestamp;
        uint256 reward = timeElapsed * rewardRate;
        // Increase accumulated rewards per share (scaled by 1e12).
        accRewardPerShare += (reward * 1e12) / supply;
        lastRewardTimestamp = block.timestamp;
    }

    function _updateReward(address account) internal {
        uint256 balance = balanceOf(account);
        uint256 accumulated = (balance * accRewardPerShare) / 1e12;
        if (accumulated < rewardDebt[account]) {
            rewardDebt[account] = accumulated;
        } else {
            pendingRewards[account] += accumulated - rewardDebt[account];
            rewardDebt[account] = accumulated;
        }
    }

    // --- Override ERC4626 Functions to Update Reward Accounting ---

    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        updatePool();
        _updateReward(receiver);
        uint256 shares = super.deposit(assets, receiver);
        rewardDebt[receiver] = (balanceOf(receiver) * accRewardPerShare) / 1e12;
        return shares;
    }

    function mint(uint256 shares, address receiver) public override returns (uint256) {
        updatePool();
        _updateReward(receiver);
        uint256 assets = super.mint(shares, receiver);
        rewardDebt[receiver] = (balanceOf(receiver) * accRewardPerShare) / 1e12;
        return assets;
    }

    function withdraw(uint256 assets, address receiver, address owner) public override returns (uint256) {
        updatePool();
        _updateReward(owner);
        uint256 shares = super.withdraw(assets, receiver, owner);
        rewardDebt[owner] = (balanceOf(owner) * accRewardPerShare) / 1e12;
        return shares;
    }

    function redeem(uint256 shares, address receiver, address owner) public override returns (uint256) {
        updatePool();
        _updateReward(owner);
        uint256 assets = super.redeem(shares, receiver, owner);
        rewardDebt[owner] = (balanceOf(owner) * accRewardPerShare) / 1e12;
        return assets;
    }

    // --- Override Transfer Functions to Update Reward Accounting ---

    function transfer(address to, uint256 amount) public virtual override(ERC20, IERC20) returns (bool) {
        bool result = super.transfer(to, amount);
        // Update reward debt for both sender and receiver after transfer.
        rewardDebt[msg.sender] = (balanceOf(msg.sender) * accRewardPerShare) / 1e12;
        rewardDebt[to] = (balanceOf(to) * accRewardPerShare) / 1e12;
        return result;
    }

    function transferFrom(address from, address to, uint256 amount) public virtual override(ERC20, IERC20) returns (bool) {
        bool result = super.transferFrom(from, to, amount);
        // Update reward debt for both sender and receiver after transfer.
        rewardDebt[from] = (balanceOf(from) * accRewardPerShare) / 1e12;
        rewardDebt[to] = (balanceOf(to) * accRewardPerShare) / 1e12;
        return result;
    }

    // --- Reward Claiming Function ---

    function claimRewards() external {
        updatePool();
        _updateReward(msg.sender);
        uint256 rewardAmount = pendingRewards[msg.sender];
        require(rewardAmount > 0, "No rewards to claim");
        pendingRewards[msg.sender] = 0;
        rewardToken.mint(msg.sender, rewardAmount);
        emit RewardClaimed(msg.sender, rewardAmount);
    }
}
