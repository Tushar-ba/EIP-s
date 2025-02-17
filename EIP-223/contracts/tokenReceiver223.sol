// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ITokenReceiver} from "../Interface/ITokenReceiver.sol";

contract ReceiverContract is ITokenReceiver {
    event TokenReceived(address from, uint256 value, bytes data);
    
    uint256 public receivedAmount;
    
    function tokenReceived(address _from, uint256 _value, bytes calldata _data) external override {
        receivedAmount += _value;
        emit TokenReceived(_from, _value, _data);
    }
    
    function getReceivedAmount() public view returns (uint256) {
        return receivedAmount;
    }
}