// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/*
 * Interfaces for ERC1363 callbacks.
 */

interface IERC1363Receiver {
    /**
     * @notice Handle the receipt of ERC1363 tokens.
     * @dev Any ERC1363 smart contract calls this function on the recipient
     * after a `transfer` or a `transferFrom`. This function MAY throw to revert and reject the transfer.
     * Return of other than the magic value MUST result in the transaction being reverted.
     * @param operator The address which initiated the transfer (i.e. msg.sender)
     * @param from The address which previously owned the token
     * @param value The amount of tokens transferred
     * @param data Additional data with no specified format
     * @return bytes4 `bytes4(keccak256("onTransferReceived(address,address,uint256,bytes)"))`
     */
    function onTransferReceived(address operator, address from, uint256 value, bytes calldata data) external returns (bytes4);
}