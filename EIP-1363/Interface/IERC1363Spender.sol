// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;
interface IERC1363Spender {
    /**
     * @notice Handle the approval of ERC1363 tokens.
     * @dev Any ERC1363 smart contract calls this function on the spender
     * after an `approve`. This function MAY throw to revert and reject the approval.
     * Return of other than the magic value MUST result in the transaction being reverted.
     * @param owner The address which called `approve` function
     * @param value The amount of tokens to be spent
     * @param data Additional data with no specified format
     * @return bytes4 `bytes4(keccak256("onApprovalReceived(address,uint256,bytes)"))`
     */
    function onApprovalReceived(address owner, uint256 value, bytes calldata data) external returns (bytes4);
}