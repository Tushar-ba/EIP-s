// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../Interfaces/IEIP3156FlashLender.sol";
import "../Interfaces/IEIP3156FlashBorrower.sol";

contract FlashBorrower is IEIP3156FlashBorrower {
    address public owner;
    bytes32 public constant CALLBACK_SUCCESS = keccak256("EIP3156FlashBorrower.onFlashLoan");

    constructor() {
        owner = msg.sender;
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        address lender = abi.decode(data, (address));
        require(msg.sender == lender, "Untrusted lender");
        require(initiator == owner || initiator == address(this), "Untrusted initiator");
        IERC20(token).approve(msg.sender, amount + fee);
        
        return CALLBACK_SUCCESS;
    }

    function executeOperation(
        address lender,
        address token,
        uint256 amount,
        bytes calldata params
    ) external {
        IEIP3156FlashLender(lender).flashLoan(
            IEIP3156FlashBorrower(address(this)),
            token,
            amount,
            abi.encode(lender)
        );
    }
}
