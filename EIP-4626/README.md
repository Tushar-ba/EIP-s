# Detailed Contract Documentation for Yield Generating Vault

## Overview

This system consists of three main contracts:

1. **RewardToken**  
   A mintable ERC20 token that serves as the reward currency. Only the vault (which becomes the owner) can mint new tokens when yield is generated.

2. **TestToken**  
   A simple ERC20 token that acts as the underlying asset (for example, a stablecoin or any ERC20 token) that users deposit into the vault.

3. **MyYieldVault**  
   A vault contract that extends the ERC4626 tokenized vault standard (which itself is an ERC20 token) and adds custom yield-generation logic. Users deposit underlying assets (TestToken) and receive vault shares (MVT) in return. Over time, yield is generated at a constant rate (rewardRate) and is allocated to vault share holders proportionally. Users can claim these rewards, which are paid in RewardToken.

---

## ERC4626 Standard: What We Use

ERC4626 is a standardized interface for tokenized vaults. It defines common functions such as:

- **`deposit(uint256 assets, address receiver)`**  
  Transfers a specific amount of underlying tokens into the vault and mints corresponding vault shares.

- **`mint(uint256 shares, address receiver)`**  
  Calculates and transfers the necessary underlying tokens so that the receiver gets a specified number of vault shares.

- **`withdraw(uint256 assets, address receiver, address owner)`** and **`redeem(uint256 shares, address receiver, address owner)`**  
  These functions allow users to withdraw or redeem vault shares for the corresponding amount of underlying assets.

- **Preview Functions**:  
  `previewDeposit`, `previewMint`, `previewWithdraw`, and `previewRedeem` are used to estimate conversions between underlying assets and vault shares.

Our vault uses these built-in functions for handling deposits, mints, withdrawals, and redemptions. On top of that, we add custom logic for tracking yield rewards:
  
- **Reward Accumulation:**  
  A global variable `accRewardPerShare` (scaled by 1e12 for precision) tracks the cumulative rewards per vault share. It’s updated by the `updatePool()` function based on the elapsed time and a constant reward rate (`rewardRate`).

- **User Accounting:**  
  Each user has a `rewardDebt` (the portion of rewards already accounted for) and a `pendingRewards` balance that is updated when deposits, withdrawals, or transfers occur.

---

## Contract Details

### 1. RewardToken

- **Purpose:**  
  A standard ERC20 token that is mintable only by its owner. After deployment, ownership is transferred to the vault so that only the vault can mint reward tokens.

- **Key Function:**  
  `mint(address to, uint256 amount)` – Mints the specified amount of tokens to an address. Only callable by the owner.

### 2. TestToken

- **Purpose:**  
  A simple ERC20 token that acts as the underlying asset. It is deployed with an initial supply that is assigned to the deployer. Users deposit this token into the vault.

### 3. MyYieldVault

- **Inherits from:**  
  - **ERC20** – Provides basic token (vault share) functionality (name, symbol, transfer, etc.).
  - **ERC4626** – Provides standardized deposit, mint, withdraw, and redeem functions and conversion math between assets and shares.
  - **Ownable** – Enables access control (e.g., setting the owner for minting rewards).

- **Custom Variables:**
  - `rewardRate`: The rate (in RewardToken per second) at which yield is generated.
  - `accRewardPerShare`: Accumulated rewards per share (scaled by 1e12 for precision).
  - `lastRewardTimestamp`: The last time the reward pool was updated.
  - Mappings `rewardDebt` and `pendingRewards` to track each user’s yield.

- **Custom Functions:**
  - **`updatePool()`**  
    Updates the global reward state. If the vault has a nonzero supply of vault shares, it calculates the new rewards based on elapsed time and increases `accRewardPerShare`.

  - **`_updateReward(address account)`**  
    Updates the pending reward balance for a given account. It calculates the accumulated reward for the current balance, compares it to the recorded `rewardDebt`, and updates `pendingRewards` accordingly.

  - **`claimRewards()`**  
    Allows a user to claim all accumulated rewards (pendingRewards). The function calls `updatePool()` and `_updateReward()`, then mints the reward tokens for the user via the RewardToken contract.

- **Vault Operations:**  
  The vault’s deposit, mint, withdraw, and redeem functions are inherited from ERC4626 and extended to update reward accounting. For example:
  
  - On a **deposit**, before the user’s share balance changes, `_updateReward(receiver)` is called, then after the deposit, `rewardDebt` is updated for the receiver.
  
  - On **transfer** (using overridden `transfer` and `transferFrom` functions), the reward accounting for both the sender and receiver is updated.

---

## Example Math: Deposit, Yield Accumulation, and Claim

### Scenario:
- **User Deposit:**  
  A user (Alice) deposits **1000 TestToken** into the vault.
- **Vault Shares Received:**  
  Assuming the vault is new and has no other assets, the conversion is 1:1.  
  **Alice receives 1000 vault shares (MVT).**
- **Reward Generation:**  
  The vault has a constant reward rate of **1 RewardToken per second**.
- **Elapsed Time:**  
  After **1000 seconds** have passed.
  
### Calculation Steps:

1. **Update Pool Calculation:**  
   When `updatePool()` is called:
   - `timeElapsed = 1000 seconds`
   - `totalSupply` of vault shares = **1000 shares** (since Alice’s deposit is the only deposit)
   - The new rewards generated = `rewardRate * timeElapsed = 1 * 1000 = 1000 RewardTokens`
   - The increase in accumulated reward per share is calculated as:  
     
     \[
     \text{delta} = \frac{(1000 \times 10^{12})}{1000} = 10^{12}
     \]
     
     Hence, `accRewardPerShare` becomes **1e12**.
   
2. **User Pending Reward Calculation:**  
   - For Alice, with a balance of **1000 shares**, the accumulated reward is:
     
     \[
     \text{Accumulated} = \frac{1000 \times 10^{12}}{10^{12}} = 1000 \text{ RewardTokens}
     \]
     
   - If Alice’s previous `rewardDebt` was 0, then `_updateReward(addr1)` will set `pendingRewards` for Alice to **1000 RewardTokens** and update `rewardDebt` to **1000** (in scaled terms, i.e., effectively 1000 when divided by 1e12).

3. **Claim Rewards:**  
   - When Alice calls `claimRewards()`, the vault mints **1000 RewardTokens** to her account.
   - After claiming, `pendingRewards` resets to 0, and `rewardDebt` remains updated.

4. **Transfer Accounting Example:**  
   - If Alice then transfers **500 vault shares** to Bob, the reward accounting functions update both users’ `rewardDebt` based on their new share balances.
   - For instance, if before the transfer, Alice’s rewardDebt was aligned with 1000 shares (i.e., 1e12 per share), after transferring 500 shares:
     - Alice’s new balance: 500 shares → rewardDebt becomes \(500 \times 1e12 / 1e12 = 500\).
     - Bob’s balance: 500 shares (newly received) → rewardDebt is set similarly to \(500\).
   - Future yield rewards will be calculated proportionally based on each holder’s balance.

---

## What Parts of ERC4626 Are Used

- **Deposit / Mint Functions:**  
  Our vault relies on ERC4626’s built-in `deposit` and `mint` functions to convert underlying assets (TestToken) into vault shares (MVT) using the conversion math provided by ERC4626.  
  - The **`deposit`** function takes a specified amount of underlying assets and mints a proportional number of shares.
  - The **`mint`** function allows specifying the number of shares to mint and calculates the required underlying asset deposit.
  
- **Withdraw / Redeem Functions:**  
  These functions allow users to convert their vault shares back into underlying assets. ERC4626 manages the conversion math, ensuring that users get the correct amount of TestToken in exchange for their shares.

- **Preview Functions:**  
  Although not explicitly detailed in our doc, ERC4626 provides functions such as `previewDeposit` and `previewMint` that help users estimate the amount of shares or assets before performing a deposit/mint operation.

Our vault extends these ERC4626 functions by adding yield reward logic (using `updatePool()` and `_updateReward()`) so that whenever a deposit, mint, withdrawal, or transfer occurs, the vault’s yield state is updated accordingly.

---

## Conclusion

This system leverages the standardized functionality of ERC4626 to handle deposits and withdrawals of underlying assets, while adding a layer of yield generation. The yield is computed based on elapsed time and is distributed proportionally to vault share holders. Detailed math shows that for every vault share, the rewards accumulate based on the global `accRewardPerShare`. This design provides both a robust tokenized vault interface (as defined by ERC4626) and a simple yield mechanism that can be extended or integrated into more complex strategies.

By reviewing the console logs (using `ethers.formatUnits`) in your tests, you can verify each step of the conversion and reward distribution, ensuring that the math holds true as described in this documentation.

---

This documentation should serve as a comprehensive guide to understanding the design, implementation, and math behind your yield-generating vault system.