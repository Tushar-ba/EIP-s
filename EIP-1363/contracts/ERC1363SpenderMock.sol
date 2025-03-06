// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC1363Spender} from "../Interface/IERC1363Spender.sol";

contract ERC1363SpenderMock is IERC1363Spender {
    event ApprovalReceived(address owner, uint256 value, bytes data);
    bool public isTrue;

    function calling() public {
         isTrue ? isTrue = false : isTrue = true;
    }

    function onApprovalReceived(address owner, uint256 value, bytes calldata data)
        external
        override
        returns (bytes4)
    {   
        calling();
        emit ApprovalReceived(owner, value, data);
        return ERC1363_APPROVED;
    }

    // The magic value is calculated as below:
    bytes4 public constant ERC1363_APPROVED = bytes4(keccak256("onApprovalReceived(address,uint256,bytes)"));
}