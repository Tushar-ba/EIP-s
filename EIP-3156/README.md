
# Flash Loan Smart Contract Documentation

## Overview of EIP-3156 (Flash Loan Standard)

EIP-3156 is an Ethereum Improvement Proposal that standardizes flash loans in the Ethereum ecosystem. Flash loans allow users to borrow assets without collateral, as long as the borrowed amount is returned in the same transaction. This enables arbitrage opportunities, collateral swapping, liquidation, and other DeFi functionalities.

### Advantages of EIP-3156 Flash Loans

* **Standardization:** Provides a unified interface for flash loans.
* **Efficiency:** No need for upfront collateral.
* **Flexibility:** Enables arbitrage, liquidation, and collateral swapping.
* **Security:** Ensures repayment in the same transaction, preventing losses.

## Contracts Explanation

### **TestToken (ERC20 Token Implementation)**

The `TestToken` contract is a simple ERC-20 token that can be used for flash loans.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor() ERC20("Test Token", "TEST") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }
}
```

* **ERC20 Token:** Implements a standard ERC20 token.
* **Minting:** Creates an initial supply of 1,000,000 TEST tokens.
* **Decimals:** Uses the standard `decimals()` function for precision.

### **Flash Borrower Contract**

This contract allows users to borrow tokens using flash loans and return them in the same transaction.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../Interfaces/IEIP3156FlashLender.sol";
import "../Interfaces/IEIP3156FlashBorrower.sol";

contract FlashBorrower is IEIP3156FlashBorrower {
    address public owner;
    bytes32 public constant CALLBACK_SUCCESS = keccak256("EIP3156FlashBorrower.onFlashLoan");

    constructor() {
        owner = msg.sender;
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        address lender = abi.decode(data, (address));
        require(msg.sender == lender, "Untrusted lender");
        require(initiator == owner || initiator == address(this), "Untrusted initiator");
        IERC20(token).approve(msg.sender, amount + fee);
      
        return CALLBACK_SUCCESS;
    }

    function executeOperation(
        address lender,
        address token,
        uint256 amount,
        bytes calldata params
    ) external {
        IEIP3156FlashLender(lender).flashLoan(
            IEIP3156FlashBorrower(address(this)),
            token,
            amount,
            abi.encode(lender)
        );
    }
}
```

* **`onFlashLoan` function:** Handles loan repayment and validation.
* **`executeOperation` function:** Calls the lender contract to initiate a flash loan.
* **Security Checks:** Ensures only a trusted lender and initiator can execute the loan.

### **Flash Lender Contract**

This contract implements the flash loan lender functionality.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../Interfaces/IEIP3156FlashLender.sol";
import "../Interfaces/IEIP3156FlashBorrower.sol";

contract FlashLender is IEIP3156FlashLender, ReentrancyGuard {
    bytes32 public constant CALLBACK_SUCCESS = keccak256("EIP3156FlashBorrower.onFlashLoan");
    uint256 public fee;

    constructor(uint256 _fee) {
        fee = _fee;
    }

    function maxFlashLoan(address token) external view override returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function flashFee(address token, uint256 amount) public view override returns (uint256) {
        require(token != address(0), "Token not supported");
        return (amount * fee) / 10000;
    }

    function flashLoan(
        IEIP3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external override nonReentrant returns (bool) {
        require(amount <= IERC20(token).balanceOf(address(this)), "Not enough tokens");
      
        uint256 _fee = flashFee(token, amount);
        require(IERC20(token).transfer(address(receiver), amount), "Transfer failed");
        uint256 expectedRepayment = amount + _fee;
        require(
            IERC20(token).balanceOf(address(this)) >= expectedRepayment,
            "Repayment amount is incorrect"
        );
      
        require(
            receiver.onFlashLoan(msg.sender, token, amount, _fee, data) == CALLBACK_SUCCESS,
            "Invalid callback return"
        );

        require(
            IERC20(token).transferFrom(address(receiver), address(this), amount + _fee),
            "Repayment failed"
        );
        return true;
    }
}
```

* **`maxFlashLoan` function:** Returns the maximum amount of tokens that can be borrowed.
* **`flashFee` function:** Calculates the loan fee.
* **`flashLoan` function:** Handles loan execution, transfers, and repayments.

## Math Example: Flash Loan Fee Calculation

Suppose:

* Loan Amount = 100,000 TEST tokens
* Fee Rate = 0.05% (5 basis points)

### **Fee Calculation:**

```
fee = (amount * feeRate) / 10000
fee = (100000 * 5) / 10000 = 5 TEST tokens
```

### **Total Repayment:**

```
repayment = amount + fee
repayment = 100000 + 5 = 100005 TEST tokens
```

### **Key Validations:**

* Borrower must return **100005 TEST tokens** within the same transaction.
* If repayment fails, the transaction is reverted.

## **Conclusion**

This documentation covers an EIP-3156-compliant flash loan system. The **FlashLender** provides loans, the **FlashBorrower** executes operations with borrowed funds, and the **TestToken** acts as an ERC-20 token for transactions. The implementation follows best security practices and allows flexible DeFi use cases such as arbitrage, liquidation, and collateral swapping.
