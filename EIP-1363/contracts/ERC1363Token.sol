// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC20} from "./ERC20.sol";
import {IERC1363Receiver} from "../Interface/IERC1363Receiver.sol";
import {IERC1363Spender} from "../Interface/IERC1363Spender.sol";

contract ERC1363Token is ERC20 {
    // Magic values defined in EIP-1363
    bytes4 public constant ERC1363_RECEIVED = bytes4(keccak256("onTransferReceived(address,address,uint256,bytes)"));
    bytes4 public constant ERC1363_APPROVED = bytes4(keccak256("onApprovalReceived(address,uint256,bytes)"));

    constructor(string memory _name, string memory _symbol, uint256 _totalSupply)
        ERC20(_name, _symbol, _totalSupply)
    {}

    /// @notice Transfers tokens and then calls `onTransferReceived` on the recipient.
    function transferAndCall(address to, uint256 amount) public returns (bool) {
        return transferAndCall(to, amount, "");
    }

    function transferAndCall(address to, uint256 amount, bytes memory data) public returns (bool) {
        transfer(to, amount);
        require(_checkAndCallTransfer(msg.sender, to, amount, data), "ERC1363: transfer to non ERC1363Receiver implementer");
        return true;
    }

    /// @notice Transfers tokens on behalf of `from` and then calls `onTransferReceived` on the recipient.
    function transferFromAndCall(address from, address to, uint256 amount) public returns (bool) {
        return transferFromAndCall(from, to, amount, "");
    }

    function transferFromAndCall(address from, address to, uint256 amount, bytes memory data) public returns (bool) {
        transferFrom(from, to, amount);
        require(_checkAndCallTransfer(from, to, amount, data), "ERC1363: transfer to non ERC1363Receiver implementer");
        return true;
    }

    /// @notice Approves tokens and then calls `onApprovalReceived` on the spender.
    function approveAndCall(address spender, uint256 amount) public returns (bool) {
        return approveAndCall(spender, amount, "");
    }

    function approveAndCall(address spender, uint256 amount, bytes memory data) public returns (bool) {
        approve(spender, amount);
        require(_checkAndCallApprove(spender, amount, data), "ERC1363: approve to non ERC1363Spender implementer");
        return true;
    }

    /**
     * @dev Internal function to invoke `onTransferReceived` on a target address.
     * The call is not executed if the target address is not a contract.
     */
    function _checkAndCallTransfer(address from, address to, uint256 amount, bytes memory data) internal returns (bool) {
        if (isContract(to)) {
            try IERC1363Receiver(to).onTransferReceived(msg.sender, from, amount, data) returns (bytes4 retval) {
                return (retval == ERC1363_RECEIVED);
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC1363: transfer to non ERC1363Receiver implementer");
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        }
        return true;
    }

    /**
     * @dev Internal function to invoke `onApprovalReceived` on a target address.
     * The call is not executed if the target address is not a contract.
     */
    function _checkAndCallApprove(address spender, uint256 amount, bytes memory data) internal returns (bool) {
        if (isContract(spender)) {
            try IERC1363Spender(spender).onApprovalReceived(msg.sender, amount, data) returns (bytes4 retval) {
                return (retval == ERC1363_APPROVED);
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC1363: approve to non ERC1363Spender implementer");
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        }
        return true;
    } 

    /// @notice Utility function to check if an address is a contract.
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }
}