// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

contract NonImplementingContract {
    // This contract intentionally does not implement IERC777Recipient
    
    // Simple function to verify contract is working
    function getVersion() public pure returns (string memory) {
        return "1.0.0";
    }
    
    // Allow receiving ETH
    receive() external payable {}
}