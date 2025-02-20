const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EIP223", function() {
  let owner;
  let EIP223Enabled, EIP223Disabled, EIP223Contract;
  const INITIAL_SUPPLY = 1; // 1 token

  beforeEach(async function() {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EIP223Token
    const EIPContractFactory = await ethers.getContractFactory("EIP223Token", owner);
    EIP223Contract = await EIPContractFactory.deploy(INITIAL_SUPPLY);
    await EIP223Contract.waitForDeployment();
    console.log("\nEIP223Token deployed to:", await EIP223Contract.getAddress());
    
    // Deploy Receiver Contract
    const EIP223EnabledFactory = await ethers.getContractFactory("ReceiverContract", owner);
    EIP223Enabled = await EIP223EnabledFactory.deploy();
    await EIP223Enabled.waitForDeployment();
    console.log("ReceiverContract deployed to:", await EIP223Enabled.getAddress());
    
    // Deploy Non-Receiver Contract
    const EIP223DisabledFactory = await ethers.getContractFactory("NonReceiverContract", owner);
    EIP223Disabled = await EIP223DisabledFactory.deploy();
    await EIP223Disabled.waitForDeployment();
    console.log("NonReceiverContract deployed to:", await EIP223Disabled.getAddress());
    
    // Log initial balances
    const ownerBalance = await EIP223Contract.balanceOf(owner.address);
    console.log("\nInitial owner balance:", ethers.formatEther(ownerBalance), "tokens");
  });

  it("Should send tokens to the EIP223-enabled contract", async function() {
    const transferAmount = ethers.parseEther("0.5");
    console.log("\nTest: Transfer to EIP223-enabled contract");
    console.log("Transfer amount:", ethers.formatEther(transferAmount), "tokens");
    
    // Log pre-transfer balances
    const preOwnerBalance = await EIP223Contract.balanceOf(owner.address);
    const preReceiverBalance = await EIP223Contract.balanceOf(EIP223Enabled.target);
    console.log("Pre-transfer owner balance:", ethers.formatEther(preOwnerBalance), "tokens");
    console.log("Pre-transfer receiver balance:", ethers.formatEther(preReceiverBalance), "tokens");
    
    // Execute transfer
    const tx = await EIP223Contract.connect(owner).transfer2(EIP223Enabled.target, transferAmount);
    await tx.wait();
    
    // Log post-transfer balances
    const postOwnerBalance = await EIP223Contract.balanceOf(owner.address);
    const postReceiverBalance = await EIP223Contract.balanceOf(EIP223Enabled.target);
    const receivedAmount = await EIP223Enabled.getReceivedAmount();
    
    console.log("Post-transfer owner balance:", ethers.formatEther(postOwnerBalance), "tokens");
    console.log("Post-transfer receiver balance:", ethers.formatEther(postReceiverBalance), "tokens");
    console.log("Receiver contract received amount:", ethers.formatEther(receivedAmount), "tokens");
    
    // Verify balances
    expect(postOwnerBalance).to.equal(preOwnerBalance - transferAmount);
    expect(postReceiverBalance).to.equal(preReceiverBalance + transferAmount);
    expect(receivedAmount).to.equal(transferAmount);
  });

  it("Should fail when transferring to non-EIP223 contract", async function() {
    const transferAmount = ethers.parseEther("0.5");
    console.log("\nTest: Transfer to non-EIP223 contract");
    console.log("Transfer amount:", ethers.formatEther(transferAmount), "tokens");
    
    // Log pre-transfer balances
    const preOwnerBalance = await EIP223Contract.balanceOf(owner.address);
    const preReceiverBalance = await EIP223Contract.balanceOf(EIP223Disabled.target);
    console.log("Pre-transfer owner balance:", ethers.formatEther(preOwnerBalance), "tokens");
    console.log("Pre-transfer receiver balance:", ethers.formatEther(preReceiverBalance), "tokens");
    
    // Attempt transfer and expect failure
    await expect(
      EIP223Contract.connect(owner).transfer2(EIP223Disabled.target, transferAmount)
    ).to.be.revertedWithoutReason();
    
    // Log post-attempt balances
    const postOwnerBalance = await EIP223Contract.balanceOf(owner.address);
    const postReceiverBalance = await EIP223Contract.balanceOf(EIP223Disabled.target);
    console.log("Post-attempt owner balance:", ethers.formatEther(postOwnerBalance), "tokens");
    console.log("Post-attempt receiver balance:", ethers.formatEther(postReceiverBalance), "tokens");
    
    // Verify balances remained unchanged
    expect(postOwnerBalance).to.equal(preOwnerBalance);
    expect(postReceiverBalance).to.equal(preReceiverBalance);
  });

  it("Should successfully transfer tokens to EOAs", async function() {
    const transferAmount = ethers.parseEther("0.5");
    console.log("\nTest: Transfer to EOA");
    console.log("Transfer amount:", ethers.formatEther(transferAmount), "tokens");
    
    // Log pre-transfer balances
    const preOwnerBalance = await EIP223Contract.balanceOf(owner.address);
    const preReceiverBalance = await EIP223Contract.balanceOf(addr1.address);
    console.log("Pre-transfer owner balance:", ethers.formatEther(preOwnerBalance), "tokens");
    console.log("Pre-transfer receiver (EOA) balance:", ethers.formatEther(preReceiverBalance), "tokens");
    
    // Execute transfer
    const tx = await EIP223Contract.connect(owner).transfer2(addr1.address, transferAmount);
    await tx.wait();
    
    // Log post-transfer balances
    const postOwnerBalance = await EIP223Contract.balanceOf(owner.address);
    const postReceiverBalance = await EIP223Contract.balanceOf(addr1.address);
    console.log("Post-transfer owner balance:", ethers.formatEther(postOwnerBalance), "tokens");
    console.log("Post-transfer receiver (EOA) balance:", ethers.formatEther(postReceiverBalance), "tokens");
    
    // Verify balances
    expect(postOwnerBalance).to.equal(preOwnerBalance - transferAmount);
    expect(postReceiverBalance).to.equal(preReceiverBalance + transferAmount);
  });

  it("Should fail when trying to transfer more than balance", async function() {
    const transferAmount = ethers.parseEther("2"); // More than initial supply
    console.log("\nTest: Transfer amount exceeding balance");
    console.log("Transfer amount:", ethers.formatEther(transferAmount), "tokens");
    
    // Log pre-transfer balances
    const preOwnerBalance = await EIP223Contract.balanceOf(owner.address);
    const preReceiverBalance = await EIP223Contract.balanceOf(addr1.address);
    console.log("Pre-transfer owner balance:", ethers.formatEther(preOwnerBalance), "tokens");
    console.log("Pre-transfer receiver balance:", ethers.formatEther(preReceiverBalance), "tokens");
    
    // Attempt transfer and expect failure
    await expect(
      EIP223Contract.connect(owner).transfer2(addr1.address, transferAmount)
    ).to.be.revertedWith("Insufficient balance");
    
    // Log post-attempt balances
    const postOwnerBalance = await EIP223Contract.balanceOf(owner.address);
    const postReceiverBalance = await EIP223Contract.balanceOf(addr1.address);
    console.log("Post-attempt owner balance:", ethers.formatEther(postOwnerBalance), "tokens");
    console.log("Post-attempt receiver balance:", ethers.formatEther(postReceiverBalance), "tokens");
    
    // Verify balances remained unchanged
    expect(postOwnerBalance).to.equal(preOwnerBalance);
    expect(postReceiverBalance).to.equal(preReceiverBalance);
  });
});