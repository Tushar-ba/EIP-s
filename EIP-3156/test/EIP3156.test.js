const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Flash Loan Contracts", function () {
  let testToken, flashLender, flashBorrower;
  let deployer;
  const feeBasisPoints = 100; 

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();

    const TestToken = await ethers.getContractFactory("TestToken", deployer);
    testToken = await TestToken.deploy();
    await testToken.waitForDeployment();
    console.log("TestToken deployed at:", testToken.target);

    const FlashLender = await ethers.getContractFactory("FlashLender", deployer);
    flashLender = await FlashLender.deploy(feeBasisPoints);
    await flashLender.waitForDeployment();
    console.log("FlashLender deployed at:", flashLender.target);

    const FlashBorrower = await ethers.getContractFactory("FlashBorrower", deployer);
    flashBorrower = await FlashBorrower.deploy();
    await flashBorrower.waitForDeployment();
    console.log("FlashBorrower deployed at:", flashBorrower.target);

    const poolAmount = ethers.parseUnits("10000", 18);
    console.log("Sending pool amount to FlashLender:", ethers.formatUnits(poolAmount, 18), "tokens");
    const fundLenderTx = await testToken.transfer(flashLender.target, poolAmount);
    await fundLenderTx.wait();

    const lenderBalanceAfterFunding = await testToken.balanceOf(flashLender.target);
    console.log("FlashLender balance after funding:", ethers.formatUnits(lenderBalanceAfterFunding, 18), "tokens");

    const loanAmount = ethers.parseUnits("1000", 18);
    const fee = (loanAmount * BigInt(feeBasisPoints)) / 10000n;
    const extraBuffer = ethers.parseUnits("10", 18);
    console.log("Calculated fee for loan:", ethers.formatUnits(fee, 18), "tokens");
    console.log("Sending extra buffer to FlashBorrower:", ethers.formatUnits(extraBuffer, 18), "tokens");
    const fundBorrowerTx = await testToken.transfer(flashBorrower.target, fee + extraBuffer);
    await fundBorrowerTx.wait();

    const borrowerBalanceAfterFunding = await testToken.balanceOf(flashBorrower.target);
    console.log("FlashBorrower balance after funding:", ethers.formatUnits(borrowerBalanceAfterFunding, 18), "tokens");
  });

  it("executes a flash loan successfully", async function () {
    const loanAmount = ethers.parseUnits("1000", 18);
    const fee = (loanAmount * BigInt(feeBasisPoints)) / 10000n;
    console.log("\n--- Starting Flash Loan Execution ---");
    console.log("Loan Amount:", ethers.formatUnits(loanAmount, 18), "tokens");
    console.log("Fee:", ethers.formatUnits(fee, 18), "tokens");

    const lenderBalanceBefore = await testToken.balanceOf(flashLender.target);
    const borrowerBalanceBefore = await testToken.balanceOf(flashBorrower.target);
    console.log("FlashLender balance BEFORE flash loan:", ethers.formatUnits(lenderBalanceBefore, 18), "tokens");
    console.log("FlashBorrower balance BEFORE flash loan:", ethers.formatUnits(borrowerBalanceBefore, 18), "tokens");

    const flashLoanTx = await flashBorrower.executeOperation(
      flashLender.target, 
      testToken.target,   
      loanAmount,         
      "0x"                
    );
    await flashLoanTx.wait();
    console.log("Flash loan executed.");

    const lenderFinalBalance = await testToken.balanceOf(flashLender.target);
    const borrowerFinalBalance = await testToken.balanceOf(flashBorrower.target);
    console.log("FlashLender balance AFTER flash loan:", ethers.formatUnits(lenderFinalBalance, 18), "tokens");
    console.log("FlashBorrower balance AFTER flash loan:", ethers.formatUnits(borrowerFinalBalance, 18), "tokens");


    const expectedLenderBalance = ethers.parseUnits("10000", 18) + fee;
    expect(lenderFinalBalance).to.equal(expectedLenderBalance);
    console.log("Expected FlashLender balance:", ethers.formatUnits(expectedLenderBalance, 18), "tokens");

    const expectedBorrowerBalance = ethers.parseUnits("10", 18);
    expect(borrowerFinalBalance).to.equal(expectedBorrowerBalance);
    console.log("Expected FlashBorrower balance:", ethers.formatUnits(expectedBorrowerBalance, 18), "tokens");
  });
});

describe("Flash Loan Contracts - Edge Cases", function () {
  let testToken, flashLender, flashBorrower;
  let deployer;
  const feeBasisPoints = 100; 

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();

    const TestToken = await ethers.getContractFactory("TestToken", deployer);
    testToken = await TestToken.deploy();
    await testToken.waitForDeployment();
    console.log("TestToken deployed at:", testToken.target);

    const FlashLender = await ethers.getContractFactory("FlashLender", deployer);
    flashLender = await FlashLender.deploy(feeBasisPoints);
    await flashLender.waitForDeployment();
    console.log("FlashLender deployed at:", flashLender.target);

    const FlashBorrower = await ethers.getContractFactory("FlashBorrower", deployer);
    flashBorrower = await FlashBorrower.deploy();
    await flashBorrower.waitForDeployment();
    console.log("FlashBorrower deployed at:", flashBorrower.target);

    const poolAmount = ethers.parseUnits("10000", 18);
    await testToken.transfer(flashLender.target, poolAmount);
  });

  it("should revert if FlashLender has insufficient funds", async function () {
    const loanAmount = ethers.parseUnits("20000", 18); // More than available

    await expect(
      flashBorrower.executeOperation(
        flashLender.target,
        testToken.target,
        loanAmount,
        "0x"
      )
    ).to.be.revertedWith("Not enough tokens"); 
  });

  it("should revert if FlashBorrower does not repay the loan with fee", async function () {
    const loanAmount = ethers.parseUnits("1000", 18);
    const fee = (loanAmount * BigInt(feeBasisPoints)) / 10000n;
    const insufficientRepayment = ethers.parseUnits("9", 18);

    console.log("Loan Amount:", loanAmount.toString());
    console.log("Calculated Fee:", fee.toString());
    console.log("Total Required Repayment:", (loanAmount + fee).toString());
    console.log("Borrower Will Repay:", insufficientRepayment.toString());

    await testToken.transfer(flashBorrower.target, insufficientRepayment);
    console.log(ethers.formatEther(await testToken.balanceOf(flashBorrower.target)));
    console.log("Transferred insufficient repayment amount to borrower.");

    await expect(
        flashBorrower.executeOperation(flashLender.target, testToken.target, loanAmount, "0x")
      ).to.be.reverted;
      

    console.log("Test Passed: The loan repayment was not enough and reverted.");
});


  it("should revert if an unauthorized caller tries to borrow directly from lender", async function () {
    const loanAmount = ethers.parseUnits("1000", 18);

    await expect(
      flashLender.flashLoan(
        deployer.address,
        testToken.target,
        loanAmount,
        "0x"
      )
    ).to.be.reverted;
  });
});

