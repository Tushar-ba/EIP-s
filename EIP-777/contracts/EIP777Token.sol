// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC1820Registry } from "../Interfaces/IERC1820Registry.sol";
import {IERC777Recipient } from "../Interfaces/IERC777Recipient.sol";
import {IERC777Sender } from "../Interfaces/IERC777Sender.sol";

contract EIP777Token {
    /**
     * @dev  uncomment line 16 and comment line 14 for mainnet deployment
     * 
     * 
     * */ 
    IERC1820Registry constant internal ERC1820_REGISTRY = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);//for mainnet deployment

    //IERC1820Registry  internal ERC1820_REGISTRY;

    bytes32 constant private TOKENS_SENDER_INTERFACE_HASH = 
        keccak256("ERC777TokensSender");
    bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = 
        keccak256("ERC777TokensRecipient");

    string private _name;
    string private _symbol;
    uint256 private _totalSupply;
    
    mapping(address => uint256) private _balances;
    
    mapping(address => mapping(address => bool)) private _operators;
    

    address[] private _defaultOperators;
    
    event Sent(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes userData,
        bytes operatorData
    );
    
    event Minted(
        address indexed operator,
        address indexed to,
        uint256 amount,
        bytes userData,
        bytes operatorData
    );
    
    event Burned(
        address indexed operator,
        address indexed from,
        uint256 amount,
        bytes userData,
        bytes operatorData
    );
    
    event AuthorizedOperator(
        address indexed operator,
        address indexed tokenHolder
    );
    
    event RevokedOperator(
        address indexed operator,
        address indexed tokenHolder
    );

    /**
     * @dev uncomment line number 76 and 83 make sure you follow line 10
    */
    constructor(
        string memory name_,
        string memory symbol_,
        address[] memory defaultOperators_
        //address registryAddress Uncomment for local and test net
    ) {
        _name = name_;
        _symbol = symbol_;
        _defaultOperators = defaultOperators_;

        
       //ERC1820_REGISTRY= IERC1820Registry(registryAddress);
       // ERC1820_REGISTRY= IERC1820Registry(regAddress);

        ERC1820_REGISTRY.setInterfaceImplementer(
            address(this),
            keccak256("ERC777Token"),
            address(this)
        );
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address holder) public view returns (uint256) {
        return _balances[holder];
    }

    function send(
        address recipient,
        uint256 amount,
        bytes memory userData
    ) public {
        _send(msg.sender, msg.sender, recipient, amount, userData, "", true);
    }

    function operatorSend(
        address sender,
        address recipient,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    ) public {
        require(
            isOperatorFor(msg.sender, sender),
            "ERC777: caller is not an operator for holder"
        );
        _send(msg.sender, sender, recipient, amount, userData, operatorData, true);
    }

    function burn(uint256 amount, bytes memory userData) public {
        _burn(msg.sender, msg.sender, amount, userData, "");
    }

    function operatorBurn(
        address account,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    ) public {
        require(
            isOperatorFor(msg.sender, account),
            "ERC777: caller is not an operator for holder"
        );
        _burn(msg.sender, account, amount, userData, operatorData);
    }

    function isOperatorFor(
        address operator,
        address tokenHolder
    ) public view returns (bool) {
        return operator == tokenHolder ||
            _operators[tokenHolder][operator] ||
            isDefaultOperator(operator);
    }

    function authorizeOperator(address operator) public {
        require(msg.sender != operator, "ERC777: authorizing self as operator");
        _operators[msg.sender][operator] = true;
        emit AuthorizedOperator(operator, msg.sender);
    }

    function revokeOperator(address operator) public {
        require(operator != msg.sender, "ERC777: revoking self as operator");
        _operators[msg.sender][operator] = false;
        emit RevokedOperator(operator, msg.sender);
    }

    function defaultOperators() public view returns (address[] memory) {
        return _defaultOperators;
    }

    function isDefaultOperator(address operator) public view returns (bool) {
        for (uint256 i = 0; i < _defaultOperators.length; i++) {
            if (_defaultOperators[i] == operator) {
                return true;
            }
        }
        return false;
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
}