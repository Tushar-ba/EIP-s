// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract NonReceiverContract {
    uint256 public someValue;
    
    function setValue(uint256 _value) public {
        someValue = _value;
    }
    
    function getValue() public view returns (uint256) {
        return someValue;
    }
}
