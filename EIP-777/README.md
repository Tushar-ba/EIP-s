# EIP-777 Token Standard Documentation

## Table of Contents
1. Introduction to EIP-777
2. Key Features and Benefits
3. Core Components
4. Implementation Guide
5. Security Considerations
6. Interface Documentation
7. Usage Examples

## 1. Introduction to EIP-777

EIP-777 is an Ethereum token standard that improves upon ERC-20 while maintaining backward compatibility. It was designed to provide more powerful and flexible token interactions through the use of hooks, operators, and improved sending mechanisms.

### What Problems Does EIP-777 Solve?

The standard addresses several limitations of ERC-20:
- Lost tokens due to contracts not being able to react to incoming tokens
- Separate approve/transferFrom pattern that requires two transactions
- Lack of transaction metadata support
- Limited flexibility in who can send tokens on behalf of others

## 2. Key Features and Benefits

### 2.1 Hook Functions
EIP-777 introduces hooks that allow token holders (both contracts and externally owned accounts) to be notified about and react to incoming and outgoing tokens. This prevents tokens from being lost when sent to contracts that aren't prepared to handle them.

### 2.2 Operator System
The standard implements a flexible operator system that allows addresses to authorize other addresses (operators) to send tokens on their behalf. This is more powerful than ERC-20's allowance mechanism.

### 2.3 Data Field
Every token transaction can include metadata (`userData` and `operatorData`), enabling more complex token interactions and better integration with other systems.

## 3. Core Components

### 3.1 ERC1820 Registry
The ERC1820 registry is a central component that enables the hook system. It's a singleton contract deployed at a specific address that maps addresses to interface implementations.

```solidity
IERC1820Registry constant internal ERC1820_REGISTRY = 
    IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
```

### 3.2 Interface Hashes
The standard defines specific interface hashes for sender and recipient hooks:

```solidity
bytes32 constant private TOKENS_SENDER_INTERFACE_HASH = 
    keccak256("ERC777TokensSender");
bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = 
    keccak256("ERC777TokensRecipient");
```

## 4. Implementation Guide

### 4.1 State Variables

```solidity
string private _name;            // Token name
string private _symbol;          // Token symbol
uint256 private _totalSupply;    // Total token supply
mapping(address => uint256) private _balances;  // User balances
mapping(address => mapping(address => bool)) private _operators;  // Operator approvals
address[] private _defaultOperators;  // Default operators list
```

### 4.2 Key Functions

#### Token Information
```solidity
function name() public view returns (string memory)
function symbol() public view returns (string memory)
function totalSupply() public view returns (uint256)
function balanceOf(address holder) public view returns (uint256)
```
These functions provide basic token information and are compatible with ERC-20.

#### Sending Tokens
```solidity
function send(address recipient, uint256 amount, bytes memory userData)
```
The `send` function is the primary method for transferring tokens. It:
1. Checks for sufficient balance
2. Calls the sender's hook if implemented
3. Updates balances
4. Calls the recipient's hook if implemented
5. Emits the Sent event

#### Operator Functions
```solidity
function authorizeOperator(address operator)
function revokeOperator(address operator)
function isOperatorFor(address operator, address tokenHolder)
```
These functions manage operator relationships, allowing addresses to authorize others to move their tokens.

### 4.3 Hook Implementation

The `_send` function demonstrates hook handling:

```solidity
function _send(
    address operator,
    address from,
    address to,
    uint256 amount,
    bytes memory userData,
    bytes memory operatorData,
    bool requireReceptionAck
) internal {
    // Check for interface implementation
    address implementer = ERC1820_REGISTRY.getInterfaceImplementer(
        from,
        TOKENS_SENDER_INTERFACE_HASH
    );
    
    // Call hook if implemented
    if (implementer != address(0)) {
        IERC777Sender(implementer).tokensToSend(
            operator,
            from,
            to,
            amount,
            userData,
            operatorData
        );
    }
    
    // ... balance updates and recipient hook
}
```

## 5. Security Considerations

### 5.1 Reentrancy
Hook functions can execute arbitrary code, creating reentrancy risks. Implement checks-effects-interactions pattern:
1. Perform all checks first
2. Update state variables
3. Call external functions last

### 5.2 Hook Failures
Hook failures can block token transfers. Implement proper error handling and consider timeout mechanisms for critical operations.

### 5.3 Operator Management
Carefully manage operator authorizations to prevent unauthorized token movements.

## 6. Interface Documentation

### 6.1 IERC777Sender
```solidity
interface IERC777Sender {
    function tokensToSend(
        address operator,    // Address performing the send
        address from,        // Token holder
        address to,          // Recipient
        uint256 amount,      // Amount being sent
        bytes calldata userData,      // User-provided data
        bytes calldata operatorData   // Operator-provided data
    ) external;
}
```

### 6.2 IERC777Recipient
```solidity
interface IERC777Recipient {
    function tokensReceived(
        address operator,    // Address performing the send
        address from,        // Token sender
        address to,          // Token recipient
        uint256 amount,      // Amount received
        bytes calldata userData,      // User-provided data
        bytes calldata operatorData   // Operator-provided data
    ) external;
}
```

## 7. Usage Examples

### 7.1 Basic Token Transfer
```solidity
// Send tokens with user data
token.send(recipient, 100, "0x0123");

// Send tokens through an operator
token.authorizeOperator(operator);
token.operatorSend(holder, recipient, 100, "0x0123", "0x4567");
```

### 7.2 Implementing Hooks
```solidity
contract TokenHolder is IERC777Recipient {
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {
        // Handle incoming tokens
        // e.g., record receipt, trigger business logic
    }
}
```
