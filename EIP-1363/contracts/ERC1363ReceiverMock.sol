// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC1363Receiver} from "../Interface/IERC1363Receiver.sol";

contract ERC1363ReceiverMock is IERC1363Receiver {
    event Received(address operator, address from, uint256 value, bytes data);
    bool public isTrue;

    function called() public{
         isTrue ? isTrue = false : isTrue = true;
    } 
    
    function onTransferReceived(address operator, address from, uint256 value, bytes calldata data)
        external
        override
        returns (bytes4)
    {   
        called();
        emit Received(operator, from, value, data);
        return ERC1363_RECEIVED;
    }

    // The magic value is calculated as below:
    bytes4 public constant ERC1363_RECEIVED = bytes4(keccak256("onTransferReceived(address,address,uint256,bytes)"));
}