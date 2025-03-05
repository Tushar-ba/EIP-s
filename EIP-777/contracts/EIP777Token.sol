// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC1820Registry} from "../Interfaces/IERC1820Registry.sol";
import {IERC777Recipient} from "../Interfaces/IERC777Recipient.sol";
import {IERC777Sender} from "../Interfaces/IERC777Sender.sol";

contract EIP777Token {
    IERC1820Registry internal ERC1820_REGISTRY;

    address private _owner;

    bytes32 constant private TOKENS_SENDER_INTERFACE_HASH = 
        keccak256("ERC777TokensSender");
    bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = 
        keccak256("ERC777TokensRecipient");

    string private _name;
    string private _symbol;
    uint256 private _totalSupply;
    uint256 private constant _granularity = 1;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => bool)) private _operators;
    
    address[] private _defaultOperators;

    event Sent(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes data,
        bytes operatorData
    );
    
    event Minted(
        address indexed operator,
        address indexed to,
        uint256 amount,
        bytes data,
        bytes operatorData
    );
    
    event Burned(
        address indexed operator,
        address indexed from,
        uint256 amount,
        bytes data,
        bytes operatorData
    );
    
    event AuthorizedOperator(
        address indexed operator,
        address indexed holder
    );
    
    event RevokedOperator(
        address indexed operator,
        address indexed holder
    );

    constructor(
        string memory name_,
        string memory symbol_,
        address[] memory defaultOperators_,
        address registryAddress,
        uint256 initialSupply_ // Added initial supply parameter
    ) {
        _name = name_;
        _symbol = symbol_;
        _defaultOperators = defaultOperators_;
        
        _owner = msg.sender;

        // Mint initial supply to owner
        _balances[msg.sender] = initialSupply_;
        _totalSupply = initialSupply_;
        emit Minted(msg.sender, msg.sender, initialSupply_, "", "");

        ERC1820_REGISTRY = IERC1820Registry(registryAddress);

        ERC1820_REGISTRY.setInterfaceImplementer(
            address(this),
            keccak256("ERC777Token"),
            address(this)
        );
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "ERC777: caller is not the owner");
        _;
    }

    function name() external view returns (string memory) {
        return _name;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address holder) external view returns (uint256) {
        return _balances[holder];
    }

    function granularity() external pure returns (uint256) {
        return _granularity;
    }

    function defaultOperators() external view returns (address[] memory) {
        return _defaultOperators;
    }

    function isOperatorFor(
        address operator,
        address holder
    ) external view returns (bool) {
        return operator == holder ||
            _operators[holder][operator] ||
            _isDefaultOperator(operator);
    }

    function authorizeOperator(address operator) external onlyOwner {
        require(msg.sender != operator, "ERC777: authorizing self as operator");
        _operators[msg.sender][operator] = true;
        emit AuthorizedOperator(operator, msg.sender);
    }

    function revokeOperator(address operator) external {
        require(operator != msg.sender, "ERC777: revoking self as operator");
        _operators[msg.sender][operator] = false;
        emit RevokedOperator(operator, msg.sender);
    }

    function send(address to, uint256 amount, bytes calldata data) external {
        _send(msg.sender, msg.sender, to, amount, data, "", true);
    }

    function operatorSend(
        address from,
        address to,
        uint256 amount,
        bytes calldata data,
        bytes calldata operatorData
    ) external {
        require(
            this.isOperatorFor(msg.sender, from),
            "ERC777: caller is not an operator for holder"
        );
        _send(msg.sender, from, to, amount, data, operatorData, true);
    }

    function burn(uint256 amount, bytes calldata data) external {
        _burn(msg.sender, msg.sender, amount, data, "");
    }

    function operatorBurn(
        address from,
        uint256 amount,
        bytes calldata data,
        bytes calldata operatorData
    ) external {
        require(
            this.isOperatorFor(msg.sender, from),
            "ERC777: caller is not an operator for holder"
        );
        _burn(msg.sender, from, amount, data, operatorData);
    }

    function _send(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData,
        bool requireReceptionAck
    ) internal {
        require(from != address(0), "ERC777: send from the zero address");
        require(to != address(0), "ERC777: send to the zero address");
        require(_balances[from] >= amount, "ERC777: insufficient balance");
        require(amount % _granularity == 0, "ERC777: amount must be a multiple of granularity");

        address implementer = ERC1820_REGISTRY.getInterfaceImplementer(
            from,
            TOKENS_SENDER_INTERFACE_HASH
        );
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

        _balances[from] -= amount;
        _balances[to] += amount;

        if (requireReceptionAck) {
            implementer = ERC1820_REGISTRY.getInterfaceImplementer(
                to,
                TOKENS_RECIPIENT_INTERFACE_HASH
            );
            if (to.code.length > 0 && implementer == address(0)) {
                revert("ERC777: recipient contract must be registered");
            }
            if (implementer != address(0)) {
                IERC777Recipient(implementer).tokensReceived(
                    operator,
                    from,
                    to,
                    amount,
                    userData,
                    operatorData
                );
            }
        }

        emit Sent(operator, from, to, amount, userData, operatorData);
    }

    function _burn(
        address operator,
        address from,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    ) internal {
        require(from != address(0), "ERC777: burn from the zero address");
        require(_balances[from] >= amount, "ERC777: insufficient balance");
        require(amount % _granularity == 0, "ERC777: amount must be a multiple of granularity");

        address implementer = ERC1820_REGISTRY.getInterfaceImplementer(
            from,
            TOKENS_SENDER_INTERFACE_HASH
        );
        if (implementer != address(0)) {
            IERC777Sender(implementer).tokensToSend(
                operator,
                from,
                address(0),
                amount,
                userData,
                operatorData
            );
        }

        _balances[from] -= amount;
        _totalSupply -= amount;

        emit Burned(operator, from, amount, userData, operatorData);
    }

    function _isDefaultOperator(address operator) internal view returns (bool) {
        for (uint256 i = 0; i < _defaultOperators.length; i++) {
            if (_defaultOperators[i] == operator) {
                return true;
            }
        }
        return false;
    }
}