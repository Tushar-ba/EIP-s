// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.28;

interface ITokenReceiver {
    function tokenReceived(address _from, uint256 _value, bytes calldata _data) external;
}
