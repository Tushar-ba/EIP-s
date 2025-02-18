// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../Interfaces/IEIP3156FlashLender.sol";
import "../Interfaces/IEIP3156FlashBorrower.sol";

contract FlashLender is IEIP3156FlashLender, ReentrancyGuard {
    bytes32 public constant CALLBACK_SUCCESS = keccak256("EIP3156FlashBorrower.onFlashLoan");
    uint256 public fee; 

    constructor(uint256 _fee) {
        fee = _fee;
    }

    function maxFlashLoan(address token) external view override returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function flashFee(address token, uint256 amount) public view override returns (uint256) {
        require(token != address(0), "Token not supported");
        return (amount * fee) / 10000;
    }

    function flashLoan(
        IEIP3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external override nonReentrant returns (bool) {
        require(amount <= IERC20(token).balanceOf(address(this)), "Not enough tokens");
        
        uint256 _fee = flashFee(token, amount);
        require(IERC20(token).transfer(address(receiver), amount), "Transfer failed");
        uint256 expectedRepayment = amount + _fee;
        require(
            IERC20(token).balanceOf(address(this)) >= expectedRepayment,
            "Repayment amount is incorrect"
        );
        
        require(
            receiver.onFlashLoan(msg.sender, token, amount, _fee, data) == CALLBACK_SUCCESS,
            "Invalid callback return"
        );

        require(
            IERC20(token).transferFrom(address(receiver), address(this), amount + _fee),
            "Repayment failed"
        );
        return true;
    }
}
