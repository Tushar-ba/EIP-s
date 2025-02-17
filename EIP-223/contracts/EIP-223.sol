// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ITokenReceiver} from "../Interface/ITokenReceiver.sol";

contract EIP223Token {

    mapping(address => uint256) public balances;
    
    uint256 public totalSupply;
    
    string public name;
    string public symbol;

    error NotAContract(address to);
    
    event Transfer(address indexed from, address indexed to, uint256 value, bytes data);
    
 
    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply;
        balances[msg.sender] = _initialSupply * 10 ** 18;  
        name = "EIP223 Token";
        symbol = "E223";
    }
    

    function transfer(address _to, uint256 _value, bytes memory _data) public returns (bool) {
        require(balances[msg.sender] >= _value, "Insufficient balance");
        
        require(_to != address(0), "Cannot transfer to zero address");
        
        balances[msg.sender] -= _value;
        balances[_to] += _value;
        
        if(isContract(_to)) {
            ITokenReceiver receiver = ITokenReceiver(_to);
            receiver.tokenReceived(msg.sender, _value, _data);
        }
        emit Transfer(msg.sender, _to, _value, _data);
        return true;
    }
    
    function transfer2(address _to, uint256 _value) public returns (bool) {
        return transfer(_to, _value, "" ); 
    }
    
    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }
    
    function isContract(address _addr) private view returns (bool) {
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }
}