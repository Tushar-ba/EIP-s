# Implementation Guide: ERC-4626 Yield Vault with Rewards

## Overview
This guide provides a step-by-step implementation of an ERC-4626 yield vault with reward distribution. Developers can integrate this vault into their projects to allow users to deposit ERC-20 tokens, earn yield in the form of reward tokens, and redeem their assets efficiently.

---

## 1. Setting Up the ERC-4626 Vault
### **Installation of Dependencies**
Ensure you have OpenZeppelin's contracts installed:
```sh
npm install @openzeppelin/contracts
```

### **Vault Contract (MyYieldVault.sol)**
This vault extends `ERC4626`, which standardizes yield-bearing vaults.

#### **Key Features:**
- Users deposit `TestToken` and receive `MVT` (Vault Tokens)
- Rewards (`RWD`) are distributed based on deposit duration
- Implements `ERC4626` standard for interoperability
- Supports safe deposits, withdrawals, and reward claims

#### **Implementation:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {RewardToken} from "./RewardToken.sol";

contract MyYieldVault is ERC20, ERC4626, Ownable {
    using SafeERC20 for IERC20;

    uint256 public accRewardPerShare;
    uint256 public lastRewardTimestamp;
    uint256 public rewardRate;
    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public pendingRewards;

    RewardToken public rewardToken;

    event RewardClaimed(address indexed user, uint256 amount);

    constructor(IERC20 asset_, RewardToken rewardToken_, uint256 rewardRate_)
        ERC20("My Vault Token", "MVT")
        ERC4626(asset_)
        Ownable(msg.sender)
    {
        rewardToken = rewardToken_;
        rewardRate = rewardRate_;
        lastRewardTimestamp = block.timestamp;
    }

    function updatePool() public {
        if (block.timestamp <= lastRewardTimestamp) return;
        uint256 supply = totalSupply();
        if (supply == 0) {
            lastRewardTimestamp = block.timestamp;
            return;
        }
        uint256 timeElapsed = block.timestamp - lastRewardTimestamp;
        uint256 reward = timeElapsed * rewardRate;
        accRewardPerShare += (reward * 1e12) / supply;
        lastRewardTimestamp = block.timestamp;
    }

    function _updateReward(address account) internal {
        uint256 balance = balanceOf(account);
        uint256 accumulated = (balance * accRewardPerShare) / 1e12;
        if (accumulated >= rewardDebt[account]) {
            pendingRewards[account] += accumulated - rewardDebt[account];
        }
        rewardDebt[account] = accumulated;
    }

    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        updatePool();
        _updateReward(receiver);
        uint256 shares = super.deposit(assets, receiver);
        rewardDebt[receiver] = (balanceOf(receiver) * accRewardPerShare) / 1e12;
        return shares;
    }

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
```

---

## 2. Reward Token (RewardToken.sol)
This is the ERC-20 token minted as a reward.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardToken is ERC20, Ownable {
    constructor() ERC20("Reward Token", "RWD") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
```

---

## 3. Underlying Token (TestToken.sol)
This ERC-20 token represents the asset users deposit into the vault.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Test Token", "TST") {
        _mint(msg.sender, initialSupply);
    }
}
```

---

## 4. Deployment Steps
### **Step 1: Compile Contracts**
Use Hardhat to compile the contracts.
```sh
npx hardhat compile
```

### **Step 2: Deploy Using Hardhat**
Modify your `deploy.js` script:
```javascript
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const TestToken = await hre.ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy("1000000000000000000000000");
    await testToken.deployed();
    console.log("TestToken deployed to:", testToken.address);

    const RewardToken = await hre.ethers.getContractFactory("RewardToken");
    const rewardToken = await RewardToken.deploy();
    await rewardToken.deployed();
    console.log("RewardToken deployed to:", rewardToken.address);

    const Vault = await hre.ethers.getContractFactory("MyYieldVault");
    const vault = await Vault.deploy(testToken.address, rewardToken.address, "1000");
    await vault.deployed();
    console.log("Vault deployed to:", vault.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

Run the deployment script:
```sh
npx hardhat run scripts/deploy.js --network localhost
```

---

## Security Considerations
- **Reentrancy Protection:** Use `ReentrancyGuard` if external calls are added.
- **Access Control:** Ensure `mint` in `RewardToken` is owner-restricted.
- **Proper Testing:** Test reward distribution under different conditions.
- **Gas Optimization:** Avoid unnecessary writes to storage.

---

## Conclusion
This implementation provides a secure and efficient ERC-4626 yield vault with reward distribution. Developers can extend this contract with additional functionalities like compounding rewards, fee mechanisms, or automated reward distribution.



