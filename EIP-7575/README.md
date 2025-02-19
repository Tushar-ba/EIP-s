# Detailed Documentation for ERC‑7575 POC with Bidirectional Pipe

## 1. Overview

The presented proof‑of‑concept (POC) implements a vault system that follows the ERC‑7575 standard. This standard adapts the ERC‑4626 vault model to support:
- **Multiple assets/entry points:** A vault may accept deposits in different assets and/or have multiple ways (entry points) for users to participate.
- **Externalized ERC‑20 functionality:** Rather than the vault contract itself being an ERC‑20 token (as in ERC‑4626), the vault uses an external share token. This separation provides flexibility when building multi‑asset vaults or “pipes” for token conversions.
- **Pipes:** In our POC, a **bidirectional pipe** is implemented to convert between an underlying asset and the vault share token in both directions.

---

## 2. Core Contracts

The system is composed of four primary contracts:

### A. **TestToken**  
- **Purpose:**  
  Acts as the underlying asset deposited into the vault.  
- **Description:**  
  A simple ERC‑20 token that mints an initial supply to the deployer.  
- **Example:**  
  When deployed, the total supply (e.g., 1,000,000 tokens) is minted. Users will later deposit portions of TestToken into the vault.

---

### B. **Share**  
- **Purpose:**  
  Serves as the external ERC‑20 token representing vault shares.  
- **Description:**  
  - Instead of the vault implementing ERC‑20 functions directly, these functions are “externalized” to the Share token.  
  - The Share contract also holds a mapping for vault lookup: for a given underlying asset address, it stores the address of the corresponding vault.  
  - It emits the `VaultUpdate` event when the vault mapping is updated and supports ERC‑165 for the share interface.
- **Key Functions:**  
  - `mint(address to, uint256 amount)`: Mints shares (used by the vault during deposit).  
  - `burn(address from, uint256 amount)`: Burns shares (used by the vault during withdrawal).

---

### C. **TokenAVault**  
- **Purpose:**  
  Implements an ERC‑7575 vault for a specific underlying asset (TokenA in our case).  
- **Description:**  
  - Adapts deposit and withdrawal functionality from ERC‑4626 but does not include ERC‑20 methods (since it externalizes them through the Share token).  
  - When a user deposits TokenA into the vault, the vault:
    - Transfers the tokens in,
    - Mints an equivalent number of shares via the Share contract (1:1 conversion for simplicity),
    - Updates its internal `totalAssets` state.
  - When a user withdraws, it burns shares via the Share token and transfers the underlying asset out.
- **ERC‑165 Support:**  
  Returns `true` for interface ID `0x2f0a18c5` (the vault interface) and for the standard ERC‑165 interface.

---

### D. **BidirectionalPipe**  
- **Purpose:**  
  Provides a user-friendly interface for converting between the underlying asset (TestToken) and vault shares.  
- **Description:**  
  - **Bidirectional** means that it supports both:
    - **Entry conversion:** Converting an underlying asset to vault shares.
    - **Exit conversion:** Converting vault shares back to the underlying asset.
  - **How it Works:**  
    - **assetToShare:**  
      1. The user sends a specified amount of the underlying asset to the pipe.
      2. The pipe approves the vault to spend the asset.
      3. The vault’s deposit function is called, minting vault shares to the pipe.
      4. Finally, the pipe transfers the minted shares to the user.
    - **shareToAsset:**  
      1. The user sends vault shares to the pipe.
      2. The pipe approves the vault to burn those shares.
      3. The vault’s withdraw function is called, burning the shares and transferring the underlying asset to the pipe.
      4. Finally, the pipe transfers the underlying asset back to the user.

---

## 3. Example Math

Let’s walk through an example scenario with simple 1:1 conversion (i.e. 1 asset = 1 share):

### **Deposit (TokenAVault):**
- **Initial State:**  
  - The vault has `totalAssets = 0`.
  - The user (Alice) holds 1000 TestTokens.
- **Action:**  
  - Alice deposits **1000 TestTokens** into the vault.
- **Vault Operation:**  
  1. The vault calls `asset.safeTransferFrom(Alice, Vault, 1000)`.
  2. The vault then calls `mint(Alice, 1000)` on the external Share contract.
  3. The vault updates `totalAssets` to **1000**.
- **Result:**  
  - Alice now holds **1000 vault shares**.
  - The vault’s internal `totalAssets` equals **1000 TestTokens**.

### **Withdrawal (TokenAVault):**
- **Initial State:**  
  - After deposit, `totalAssets = 1000` and Alice holds 1000 shares.
- **Action:**  
  - Alice withdraws **400 TestTokens**.
- **Vault Operation:**  
  1. The vault calls `burn(Alice, 400)` on the Share token.
  2. The vault transfers **400 TestTokens** from its balance to Alice.
  3. The vault updates `totalAssets` to **600**.
- **Result:**  
  - Alice’s share balance is reduced to **600 shares**.
  - Alice receives **400 TestTokens**.
  - Vault’s internal state now shows `totalAssets = 600`.

### **Conversion Using BidirectionalPipe:**

#### **assetToShare Conversion:**
- **Initial State:**  
  - Assume the vault has no prior deposits.
  - Alice holds 1000 TestTokens.
- **Action:**  
  - Alice calls `assetToShare(1000)` on the Pipe.
- **Pipe Operation:**  
  1. The pipe transfers 1000 TestTokens from Alice.
  2. The pipe approves the vault to spend 1000 TestTokens.
  3. The pipe calls `deposit(1000, Pipe)` on the vault.
  4. The vault mints 1000 shares to the pipe and updates `totalAssets` to 1000.
  5. The pipe then transfers 1000 shares from itself to Alice.
- **Result:**  
  - Alice ends up with **1000 vault shares**.
  - The vault’s internal `totalAssets` equals **1000 TestTokens**.

#### **shareToAsset Conversion:**
- **Initial State:**  
  - Alice holds 1000 vault shares.
  - The vault has `totalAssets = 1000`.
- **Action:**  
  - Alice calls `shareToAsset(1000)` on the Pipe.
- **Pipe Operation:**  
  1. The pipe transfers 1000 vault shares from Alice.
  2. The pipe approves the vault to burn 1000 shares.
  3. The pipe calls `withdraw(1000, Pipe, Pipe)` on the vault.
  4. The vault burns the 1000 shares and transfers 1000 TestTokens to the pipe, updating `totalAssets` to 0.
  5. The pipe then transfers 1000 TestTokens to Alice.
- **Result:**  
  - Alice’s vault share balance becomes **0**.
  - Alice receives **1000 TestTokens**.
  - The vault’s internal `totalAssets` is now **0**.

---

## 4. Difference Between ERC‑4626 and ERC‑7575

### **ERC‑4626:**
- **Vault as ERC‑20:**  
  - The vault contract itself is an ERC‑20 token.  
  - Users deposit an underlying asset and receive vault shares (which are ERC‑20 tokens) that represent their stake.
- **Single Asset Focus:**  
  - Typically, ERC‑4626 vaults are designed for a single underlying asset.
- **Conversion Functions:**  
  - Implements functions like `deposit`, `mint`, `withdraw`, and `redeem`, along with preview functions for conversion math.
  
### **ERC‑7575:**
- **Externalized ERC‑20 Dependency:**  
  - The vault is no longer required to implement ERC‑20 methods.  
  - Instead, an external share token is used to represent vault shares.
- **Multi‑Asset and Multiple Entry Points:**  
  - Supports vaults that may have multiple underlying assets or entry points.  
  - This is particularly useful for liquidity pools or complex yield strategies.
- **Share-to‑Vault Lookup:**  
  - The external share token can maintain a mapping of underlying asset addresses to their corresponding vault addresses.
- **Pipes:**  
  - Allows the creation of “pipes” (both unidirectional and bidirectional) to facilitate conversion between arbitrary external tokens.  
  - A bidirectional pipe (as shown in our POC) enables users to convert assets to shares and back again.

---

## 5. What is a Bidirectional Pipe?

A **bidirectional pipe** is a converter contract that bridges between the underlying asset (e.g., TestToken) and the external share token (representing vault shares). It allows users to:
- **Enter the system:** Convert their asset into vault shares by depositing the asset through the pipe.  
- **Exit the system:** Convert their vault shares back into the underlying asset via the pipe.

This separation allows the vault to focus solely on asset management and share accounting, while the pipe provides a user-friendly interface to perform conversions without the user having to interact directly with the vault’s deposit/withdraw functions.

---

## 6. Conclusion

This ERC‑7575 POC demonstrates a flexible vault system that:
- Externalizes the ERC‑20 functionality by using a dedicated Share token.
- Supports multiple asset entry points (multi‑asset vaults) and can be extended to support complex use cases.
- Provides a bidirectional pipe that allows seamless conversion between an underlying asset and vault shares.

**Example Math Recap:**  
If a user deposits 1000 TestTokens, they receive 1000 vault shares (1:1 conversion). With a withdrawal of 400 TestTokens, their share balance decreases accordingly, and the vault’s internal `totalAssets` adjusts. The bidirectional pipe uses these same mechanics to allow users to convert assets to shares and back, providing a seamless user interface.

This design contrasts with ERC‑4626, where the vault is itself an ERC‑20 token, by decoupling the asset management (vault) from the ERC‑20 share token. This decoupling allows for greater flexibility in handling multiple assets and more complex conversion scenarios such as those enabled by pipes.

---
