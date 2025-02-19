const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Share", function () {
  let Share, share;
  let owner, addr1, addr2;

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    Share = await ethers.getContractFactory("Share");
    share = await Share.deploy("Vault Share", "VS");
    await share.waitForDeployment();
  });

  it("should have correct name and symbol", async function () {
    const name = await share.name();
    const symbol = await share.symbol();
    expect(name).to.equal("Vault Share");
    expect(symbol).to.equal("VS");
    console.log("Share Token - Name:", name);
    console.log("Share Token - Symbol:", symbol);
  });

  it("should support ERC-7575 share interface", async function () {
    // Interface ID for ERC-7575 share: 0xf815c03d
    const isSupported = await share.supportsInterface("0xf815c03d");
    expect(isSupported).to.be.true;
    console.log("Share Token - Supports ERC-7575 Interface (0xf815c03d):", isSupported);
  });

  it("should mint and burn tokens", async function () {
    const mintAmount = ethers.parseUnits("100", 18);
    // Before mint:
    console.log("Share Token - Addr1 balance before mint:", ethers.formatUnits(await share.balanceOf(addr1.address), 18));
    await (await share.mint(addr1.address, mintAmount)).wait();
    const balanceAfterMint = await share.balanceOf(addr1.address);
    console.log("Share Token - Addr1 balance after mint:", ethers.formatUnits(balanceAfterMint, 18));
    expect(balanceAfterMint).to.equal(mintAmount);

    const burnAmount = ethers.parseUnits("50", 18);
    // Before burn:
    console.log("Share Token - Addr1 balance before burn:", ethers.formatUnits(balanceAfterMint, 18));
    await (await share.burn(addr1.address, burnAmount)).wait();
    const balanceAfterBurn = await share.balanceOf(addr1.address);
    console.log("Share Token - Addr1 balance after burn:", ethers.formatUnits(balanceAfterBurn, 18));
    expect(balanceAfterBurn).to.equal(ethers.parseUnits("50", 18));
  });

  it("should update vault mapping and emit VaultUpdate event", async function () {
    const dummyAsset = "0x0000000000000000000000000000000000000001";
    const dummyVault = "0x0000000000000000000000000000000000000002";
    await expect(share.updateVault(dummyAsset, dummyVault))
      .to.emit(share, "VaultUpdate")
      .withArgs(dummyAsset, dummyVault);
    const mappedVault = await share.vault(dummyAsset);
    console.log("Share Token - Vault mapping for asset", dummyAsset, ":", mappedVault);
    expect(mappedVault).to.equal(dummyVault);
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
    const totalSupply = await testToken.totalSupply();
    const ownerBalance = await testToken.balanceOf(await owner.getAddress());
    expect(totalSupply).to.equal(initialSupply);
    expect(ownerBalance).to.equal(initialSupply);
    console.log("TestToken - Total Supply:", ethers.formatUnits(totalSupply, 18));
    console.log("TestToken - Owner Balance:", ethers.formatUnits(ownerBalance, 18));
  });

  it("should allow token transfers", async function () {
    const transferAmount = ethers.parseUnits("1000", 18);
    // Before transfer:
    const ownerBalanceBefore = await testToken.balanceOf(await owner.getAddress());
    console.log("TestToken - Owner Balance before transfer:", ethers.formatUnits(ownerBalanceBefore, 18));
    await (await testToken.transfer(await addr1.getAddress(), transferAmount)).wait();
    const addr1Balance = await testToken.balanceOf(await addr1.getAddress());
    const ownerBalanceAfter = await testToken.balanceOf(await owner.getAddress());
    console.log("TestToken - Transferred amount to Addr1:", ethers.formatUnits(transferAmount, 18));
    console.log("TestToken - Addr1 Balance:", ethers.formatUnits(addr1Balance, 18));
    console.log("TestToken - Owner Balance after transfer:", ethers.formatUnits(ownerBalanceAfter, 18));
    expect(addr1Balance).to.equal(transferAmount);
  });
});

describe("TokenAVault", function () {
  let TestToken, testToken;
  let Share, share;
  let TokenAVault, tokenAVault;
  let owner, addr1, addr2;
  const initialSupply = ethers.parseUnits("1000000", 18);

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    // Deploy underlying asset (TestToken)
    TestToken = await ethers.getContractFactory("TestToken");
    testToken = await TestToken.deploy(initialSupply);
    await testToken.waitForDeployment();

    // Deploy external share token
    Share = await ethers.getContractFactory("Share");
    share = await Share.deploy("Vault Share", "VS");
    await share.waitForDeployment();

    // Deploy the vault (TokenAVault) with TestToken as asset and external share token address.
    TokenAVault = await ethers.getContractFactory("TokenAVault");
    tokenAVault = await TokenAVault.deploy(await testToken.getAddress(), await share.getAddress());
    await tokenAVault.waitForDeployment();

    // Update the share token with the vault info for the underlying asset.
    await (await share.updateVault(await testToken.getAddress(), await tokenAVault.getAddress())).wait();
  });

  it("should allow deposit and mint vault shares", async function () {
    const depositAmount = ethers.parseUnits("1000", 18);
    // Before deposit:
    const addr1TestTokenBefore = await testToken.balanceOf(await addr1.getAddress());
    const vaultAssetsBefore = await tokenAVault.totalAssets();
    console.log("TokenAVault - Before Deposit:");
    console.log("  Addr1 TestToken Balance:", ethers.formatUnits(addr1TestTokenBefore, 18));
    console.log("  Vault Total Assets:", ethers.formatUnits(vaultAssetsBefore, 18));
    
    // Transfer some TestToken to addr1.
    await (await testToken.transfer(await addr1.getAddress(), depositAmount)).wait();
    // Addr1 approves the vault to spend TestToken.
    await (await testToken.connect(addr1).approve(await tokenAVault.getAddress(), depositAmount)).wait();
    // Deposit into the vault.
    await (await tokenAVault.connect(addr1).deposit(depositAmount, await addr1.getAddress())).wait();

    // After deposit:
    const vaultAssetsAfter = await tokenAVault.totalAssets();
    const addr1ShareBalance = await share.balanceOf(await addr1.getAddress());
    console.log("TokenAVault - After Deposit:");
    console.log("  Vault Total Assets:", ethers.formatUnits(vaultAssetsAfter, 18));
    console.log("  Addr1 Share Token Balance:", ethers.formatUnits(addr1ShareBalance, 18));

    expect(vaultAssetsAfter).to.equal(depositAmount);
    expect(addr1ShareBalance).to.equal(depositAmount);
  });

  it("should allow withdrawal and burn vault shares", async function () {
    const depositAmount = ethers.parseUnits("1000", 18);
    // Deposit process for addr1.
    await (await testToken.transfer(await addr1.getAddress(), depositAmount)).wait();
    await (await testToken.connect(addr1).approve(await tokenAVault.getAddress(), depositAmount)).wait();
    await (await tokenAVault.connect(addr1).deposit(depositAmount, await addr1.getAddress())).wait();
  
    // Record balances before withdrawal.
    const addr1TestTokenBefore = await testToken.balanceOf(await addr1.getAddress());
    const vaultAssetsBefore = await tokenAVault.totalAssets();
    const addr1ShareBefore = await share.balanceOf(await addr1.getAddress());
    console.log("TokenAVault - Before Withdrawal:");
    console.log("  Addr1 TestToken Balance:", ethers.formatUnits(addr1TestTokenBefore, 18));
    console.log("  Vault Total Assets:", ethers.formatUnits(vaultAssetsBefore, 18));
    console.log("  Addr1 Share Token Balance:", ethers.formatUnits(addr1ShareBefore, 18));
  
    // Withdraw a portion (e.g., 400 tokens).
    const withdrawAmount = ethers.parseUnits("400", 18);
    await (await tokenAVault.connect(addr1).withdraw(withdrawAmount, await addr1.getAddress(), await addr1.getAddress())).wait();
  
    // Record balances after withdrawal.
    const addr1TestTokenAfter = await testToken.balanceOf(await addr1.getAddress());
    const vaultAssetsAfter = await tokenAVault.totalAssets();
    const addr1ShareAfter = await share.balanceOf(await addr1.getAddress());
    console.log("TokenAVault - After Withdrawal:");
    console.log("  Addr1 TestToken Balance:", ethers.formatUnits(addr1TestTokenAfter, 18));
    console.log("  Vault Total Assets:", ethers.formatUnits(vaultAssetsAfter, 18));
    console.log("  Addr1 Share Token Balance:", ethers.formatUnits(addr1ShareAfter, 18));
    console.log("  TestToken Balance Change (Withdrawal):", ethers.formatUnits(addr1TestTokenAfter - addr1TestTokenBefore, 18));
  
    expect(vaultAssetsAfter).to.equal(depositAmount - withdrawAmount);
    expect(addr1ShareAfter).to.equal(depositAmount - withdrawAmount);
  });
});

describe("BidirectionalPipe", function () {
  let TestToken, testToken;
  let Share, share;
  let TokenAVault, tokenAVault;
  let BidirectionalPipe, pipe;
  let owner, addr1, addr2;
  const initialSupply = ethers.parseUnits("1000000", 18);

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy underlying asset (TestToken)
    TestToken = await ethers.getContractFactory("TestToken");
    testToken = await TestToken.deploy(initialSupply);
    await testToken.waitForDeployment();

    // Deploy external share token.
    Share = await ethers.getContractFactory("Share");
    share = await Share.deploy("Vault Share", "VS");
    await share.waitForDeployment();

    // Deploy TokenAVault.
    TokenAVault = await ethers.getContractFactory("TokenAVault");
    tokenAVault = await TokenAVault.deploy(await testToken.getAddress(), await share.getAddress());
    await tokenAVault.waitForDeployment();

    // Update share mapping in the Share token.
    await (await share.updateVault(await testToken.getAddress(), await tokenAVault.getAddress())).wait();

    // Deploy the BidirectionalPipe with the vault and asset addresses.
    const BidirectionalPipeFactory = await ethers.getContractFactory("BidirectionalPipe");
    pipe = await BidirectionalPipeFactory.deploy(await tokenAVault.getAddress(), await testToken.getAddress());
    await pipe.waitForDeployment();
  });

  it("should convert asset to share (assetToShare)", async function () {
    const depositAmount = ethers.parseUnits("1000", 18);
    // Before conversion: addr1's TestToken balance.
    const addr1AssetBefore = await testToken.balanceOf(await addr1.getAddress());
    const vaultAssetsBefore = await tokenAVault.totalAssets();
    const addr1ShareBefore = await share.balanceOf(await addr1.getAddress());
    console.log("BidirectionalPipe - Before assetToShare:");
    console.log("  Addr1 TestToken Balance:", ethers.formatUnits(addr1AssetBefore, 18));
    console.log("  Vault Total Assets:", ethers.formatUnits(vaultAssetsBefore, 18));
    console.log("  Addr1 Share Balance:", ethers.formatUnits(addr1ShareBefore, 18));

    // Transfer asset to addr1.
    await (await testToken.transfer(await addr1.getAddress(), depositAmount)).wait();
    // Addr1 approves the pipe to spend the asset.
    await (await testToken.connect(addr1).approve(await pipe.getAddress(), depositAmount)).wait();
    // Call assetToShare on the pipe.
    await (await pipe.connect(addr1).assetToShare(depositAmount)).wait();

    // After conversion: addr1's balances.
    const addr1AssetAfter = await testToken.balanceOf(await addr1.getAddress());
    const vaultAssetsAfter = await tokenAVault.totalAssets();
    const addr1ShareAfter = await share.balanceOf(await addr1.getAddress());
    console.log("BidirectionalPipe - After assetToShare:");
    console.log("  Addr1 TestToken Balance:", ethers.formatUnits(addr1AssetAfter, 18));
    console.log("  Vault Total Assets:", ethers.formatUnits(vaultAssetsAfter, 18));
    console.log("  Addr1 Share Balance:", ethers.formatUnits(addr1ShareAfter, 18));

    // Expect that addr1 receives shares equal to depositAmount.
    expect(addr1ShareAfter).to.equal(depositAmount);
    // And vault totalAssets should equal depositAmount.
    expect(vaultAssetsAfter).to.equal(depositAmount);
  });

  it("should convert share to asset (shareToAsset)", async function () {
    const depositAmount = ethers.parseUnits("1000", 18);
    // First, deposit directly into the vault so that addr1 gets shares.
    await (await testToken.transfer(await addr1.getAddress(), depositAmount)).wait();
    await (await testToken.connect(addr1).approve(await tokenAVault.getAddress(), depositAmount)).wait();
    await (await tokenAVault.connect(addr1).deposit(depositAmount, await addr1.getAddress())).wait();

    // Record balances before conversion.
    const addr1ShareBefore = await share.balanceOf(await addr1.getAddress());
    const addr1AssetBefore = await testToken.balanceOf(await addr1.getAddress());
    const vaultAssetsBefore = await tokenAVault.totalAssets();
    console.log("BidirectionalPipe - Before shareToAsset:");
    console.log("  Addr1 Share Balance:", ethers.formatUnits(addr1ShareBefore, 18));
    console.log("  Vault Total Assets:", ethers.formatUnits(vaultAssetsBefore, 18));
    console.log("  Addr1 TestToken Balance:", ethers.formatUnits(addr1AssetBefore, 18));

    // Addr1 approves the pipe to spend shares.
    await (await share.connect(addr1).approve(await pipe.getAddress(), depositAmount)).wait();
    // Call shareToAsset on the pipe.
    await (await pipe.connect(addr1).shareToAsset(depositAmount)).wait();

    // After conversion: record balances.
    const addr1ShareAfter = await share.balanceOf(await addr1.getAddress());
    const addr1AssetAfter = await testToken.balanceOf(await addr1.getAddress());
    const vaultAssetsAfter = await tokenAVault.totalAssets();
    console.log("BidirectionalPipe - After shareToAsset:");
    console.log("  Addr1 Share Balance:", ethers.formatUnits(addr1ShareAfter, 18));
    console.log("  Vault Total Assets:", ethers.formatUnits(vaultAssetsAfter, 18));
    console.log("  Addr1 TestToken Balance:", ethers.formatUnits(addr1AssetAfter, 18));

    // Expect that addr1's share balance is now zero.
    expect(addr1ShareAfter).to.equal(0);
    // And vault's totalAssets should be zero.
    expect(vaultAssetsAfter).to.equal(0);
  });
});
