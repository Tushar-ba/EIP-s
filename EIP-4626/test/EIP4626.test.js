const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("RewardToken", function () {
  let RewardToken, rewardToken;
  let owner, addr1, addr2;

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    RewardToken = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy();
    await rewardToken.waitForDeployment();
  });

  it("should have correct name and symbol", async function () {
    expect(await rewardToken.name()).to.equal("Reward Token");
    expect(await rewardToken.symbol()).to.equal("RWD");
  });

  it("should allow the owner to mint tokens", async function () {
    const mintAmount = ethers.parseUnits("100", 18); // BigInt in ethers v6
    const tx = await rewardToken.mint(addr1.address, mintAmount);
    await tx.wait();
    expect(await rewardToken.balanceOf(addr1.address)).to.equal(mintAmount);
    console.log("Minted RewardToken balance:", ethers.formatUnits(await rewardToken.balanceOf(addr1.address), 18));
  });

  it("should revert if a non-owner tries to mint", async function () {
    const mintAmount = ethers.parseUnits("100", 18);
    await expect(
      rewardToken.connect(addr1).mint(addr1.address, mintAmount)
    ).to.be.reverted;
  });
});

describe("TestToken", function () {
  let TestToken, testToken;
  let owner, addr1, addr2;
  const initialSupply = ethers.parseUnits("1000000", 18);

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    TestToken = await ethers.getContractFactory("TestToken");
    testToken = await TestToken.deploy(initialSupply);
    await testToken.waitForDeployment();
  });

  it("should have the correct initial supply", async function () {
    expect(await testToken.totalSupply()).to.equal(initialSupply);
    expect(await testToken.balanceOf(owner.address)).to.equal(initialSupply);
    console.log("TestToken totalSupply:", ethers.formatUnits(await testToken.totalSupply(), 18));
  });

  it("should allow token transfers", async function () {
    const transferAmount = ethers.parseUnits("1000", 18);
    const tx = await testToken.transfer(addr1.address, transferAmount);
    await tx.wait();
    expect(await testToken.balanceOf(addr1.address)).to.equal(transferAmount);
    console.log("Transferred TestToken amount to addr1:", ethers.formatUnits(transferAmount, 18));
  });
});

describe("MyYieldVault", function () {
  let TestToken, testToken;
  let RewardToken, rewardToken;
  let MyYieldVault, myYieldVault;
  let owner, addr1, addr2;
  const initialSupply = ethers.parseUnits("1000000", 18);
  const rewardRate = ethers.parseUnits("1", 18); // 1 reward token per second

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy TestToken and transfer some tokens to addr1
    TestToken = await ethers.getContractFactory("TestToken");
    testToken = await TestToken.deploy(initialSupply);
    await testToken.waitForDeployment();
    const depositAmount = ethers.parseUnits("1000", 18);
    await testToken.transfer(addr1.address, depositAmount);
    console.log("Transferred TestToken to addr1:", ethers.formatUnits(depositAmount, 18));

    // Deploy RewardToken
    RewardToken = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy();
    await rewardToken.waitForDeployment();

    // Deploy MyYieldVault with TestToken as the underlying asset.
    MyYieldVault = await ethers.getContractFactory("MyYieldVault");
    myYieldVault = await MyYieldVault.deploy(
      await testToken.getAddress(),
      await rewardToken.getAddress(),
      rewardRate
    );
    await myYieldVault.waitForDeployment();

    // Transfer ownership of RewardToken to the vault so it can mint rewards.
    const txTransferOwnership = await rewardToken
      .connect(owner)
      .transferOwnership(await myYieldVault.getAddress());
    await txTransferOwnership.wait();
  });

  it("should allow deposit and mint vault shares", async function () {
    const depositAmount = ethers.parseUnits("1000", 18);
    const vaultAddress = await myYieldVault.getAddress();
    // Approve the vault to spend TestToken
    await testToken.connect(addr1).approve(vaultAddress, depositAmount);
    const depositTx = await myYieldVault.connect(addr1).deposit(depositAmount, addr1.address);
    await depositTx.wait();

    console.log("Vault Total Assets:", ethers.formatUnits(await myYieldVault.totalAssets(), 18));
    console.log("Vault Shares of addr1:", ethers.formatUnits(await myYieldVault.balanceOf(addr1.address), 18));

    expect(await myYieldVault.totalAssets()).to.equal(depositAmount);
    expect(await myYieldVault.balanceOf(addr1.address)).to.be.gt(0n);
  });

  it("should allow minting vault shares by specifying share amount", async function () {
    const depositAmount = ethers.parseUnits("1000", 18);
    const vaultAddress = await myYieldVault.getAddress();
    await testToken.connect(addr1).approve(vaultAddress, depositAmount);
    // previewMint tells us how many underlying assets are needed to mint given shares.
    const sharesToMint = ethers.parseUnits("500", 18);
    const requiredAssets = await myYieldVault.previewMint(sharesToMint);
    const mintTx = await myYieldVault.connect(addr1).mint(sharesToMint, addr1.address);
    await mintTx.wait();

    console.log("Vault Shares of addr1 after mint:", ethers.formatUnits(await myYieldVault.balanceOf(addr1.address), 18));
    console.log("Vault Total Assets after mint:", ethers.formatUnits(await myYieldVault.totalAssets(), 18));
    console.log("Required underlying assets for minting 500 shares:", ethers.formatUnits(requiredAssets, 18));

    expect(await myYieldVault.balanceOf(addr1.address)).to.equal(sharesToMint);
    expect(await myYieldVault.totalAssets()).to.equal(requiredAssets);
  });

  it("should allow withdrawal of underlying assets", async function () {
    const depositAmount = ethers.parseUnits("1000", 18);
    const vaultAddress = await myYieldVault.getAddress();
    await testToken.connect(addr1).approve(vaultAddress, depositAmount);
    await myYieldVault.connect(addr1).deposit(depositAmount, addr1.address);

    // addr1 withdraws 500 units of underlying asset.
    const withdrawAmount = ethers.parseUnits("500", 18);
    const initialBalance = await testToken.balanceOf(addr1.address);
    const withdrawTx = await myYieldVault.connect(addr1).withdraw(withdrawAmount, addr1.address, addr1.address);
    await withdrawTx.wait();
    const finalBalance = await testToken.balanceOf(addr1.address);

    console.log("Initial TestToken balance of addr1:", ethers.formatUnits(initialBalance, 18));
    console.log("Final TestToken balance of addr1 after withdrawal:", ethers.formatUnits(finalBalance, 18));

    expect(finalBalance).to.be.gt(initialBalance);
  });

  it("should allow redeeming vault shares for underlying assets", async function () {
    const depositAmount = ethers.parseUnits("1000", 18);
    const vaultAddress = await myYieldVault.getAddress();
    await testToken.connect(addr1).approve(vaultAddress, depositAmount);
    await myYieldVault.connect(addr1).deposit(depositAmount, addr1.address);

    const vaultShares = await myYieldVault.balanceOf(addr1.address);
    console.log("Vault Shares of addr1 before redeem:", ethers.formatUnits(vaultShares, 18));
    // Redeem half of the vault shares.
    const sharesToRedeem = vaultShares / 2n;
    const redeemTx = await myYieldVault.connect(addr1).redeem(sharesToRedeem, addr1.address, addr1.address);
    await redeemTx.wait();

    const finalVaultShares = await myYieldVault.balanceOf(addr1.address);
    console.log("Vault Shares of addr1 after redeem:", ethers.formatUnits(finalVaultShares, 18));
    expect(finalVaultShares).to.equal(vaultShares - sharesToRedeem);
  });

  it("should accumulate rewards over time and allow claiming rewards", async function () {
    const depositAmount = ethers.parseUnits("1000", 18);
    const vaultAddress = await myYieldVault.getAddress();
    // Approve the vault to spend addr1's TestToken.
    await testToken.connect(addr1).approve(vaultAddress, depositAmount);
    await myYieldVault.connect(addr1).deposit(depositAmount, addr1.address);

    // Increase EVM time by 1000 seconds to simulate yield accumulation.
    await ethers.provider.send("evm_increaseTime", [1000]);
    await ethers.provider.send("evm_mine", []);

    // Call updatePool() to update global reward state.
    await myYieldVault.updatePool();

    const pendingRewards = await myYieldVault.pendingRewards(addr1.address);
    console.log("Pending rewards before claim (raw):", pendingRewards.toString());
    console.log("Pending rewards before claim (formatted):", ethers.formatUnits(pendingRewards, 18));

    // Now, claim rewards.
    const claimTx = await myYieldVault.connect(addr1).claimRewards();
    await claimTx.wait();

    const rewardBalance = await rewardToken.balanceOf(addr1.address);
    console.log("Reward token balance after claim (raw):", rewardBalance.toString());
    console.log("Reward token balance after claim (formatted):", ethers.formatUnits(rewardBalance, 18));
    expect(rewardBalance).to.be.gt(0n);
  });

  it("should update reward accounting on vault share transfer", async function () {
    const depositAmount = ethers.parseUnits("1000", 18);
    const vaultAddress = await myYieldVault.getAddress();
    await testToken.connect(addr1).approve(vaultAddress, depositAmount);
    await myYieldVault.connect(addr1).deposit(depositAmount, addr1.address);

    // Increase time to accumulate rewards.
    await ethers.provider.send("evm_increaseTime", [1000]);
    await ethers.provider.send("evm_mine", []);
    await myYieldVault.updatePool();

    // Transfer half of addr1's vault shares to addr2.
    const vaultShares = await myYieldVault.balanceOf(addr1.address);
    console.log("Vault Shares of addr1 before transfer:", ethers.formatUnits(vaultShares, 18));
    const transferAmount = vaultShares / 2n;
    const transferTx = await myYieldVault.connect(addr1).transfer(addr2.address, transferAmount);
    await transferTx.wait();

    const rewardDebtAddr2 = await myYieldVault.rewardDebt(addr2.address);
    console.log("Reward debt of addr2 (raw):", rewardDebtAddr2.toString());
    console.log("Reward debt of addr2 (formatted):", ethers.formatUnits(rewardDebtAddr2, 18));
    expect(rewardDebtAddr2).to.be.gt(0n);
  });
});
