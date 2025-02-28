const { ethers } = require("hardhat");
const { expect } = require("chai");

/**
 * Helper function to set a token balance directly in contract storage.
 * This allows us to set up test scenarios without needing to mint or transfer tokens.
 * The function calculates the correct storage slot for the balance mapping and
 * uses Hardhat's special RPC calls to modify the storage directly.
 */
async function setBalance(tokenAddress, account, newBalance) {
  // Storage slot 3 is where the _balances mapping is stored in the contract
  const slot = 3;
  
  // Calculate the storage slot for this specific account's balance
  // In Solidity, mapping storage slots are calculated using keccak256(abi.encode(key, slot))
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"],
    [account, slot]
  );
  const index = ethers.keccak256(encoded);
  
  // Set the storage value and mine a block to process the change
  await ethers.provider.send("hardhat_setStorageAt", [
    tokenAddress,
    index,
    ethers.zeroPadValue(ethers.toBeHex(newBalance), 32)
  ]);
  await ethers.provider.send("evm_mine", []);
}

/**
 * Helper function to set the total supply directly in contract storage.
 * This is needed when we manually set balances to ensure the total supply
 * matches the sum of all balances.
 */
async function setTotalSupply(tokenAddress, newSupply) {
  // Storage slot 2 holds the _totalSupply variable
  const slot = "0x2";
  
  await ethers.provider.send("hardhat_setStorageAt", [
    tokenAddress,
    slot,
    ethers.zeroPadValue(ethers.toBeHex(newSupply), 32)
  ]);
  await ethers.provider.send("evm_mine", []);
}

describe("EIP777Token", function () {
  let EIP777Token, token;
  let owner, addr1, addr2;
  const expectedRegistryAddress = "0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24"; //only for mainnet

  beforeEach(async function () {
    // Get test accounts
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC1820 registry which is required for EIP777 tokens
    const MockERC1820 = await ethers.getContractFactory("MockERC1820Registry");
    const mockRegistry = await MockERC1820.deploy();
    await mockRegistry.waitForDeployment();

    // Get the mock registry's bytecode and inject it at the standard address
    const mockRegistryBytecode = await ethers.provider.getCode(mockRegistry.target);
    await ethers.provider.send("hardhat_setCode", [
      expectedRegistryAddress,
      mockRegistryBytecode,
    ]);
    await ethers.provider.send("evm_mine", []);

    // Deploy the actual EIP777 token contract
    EIP777Token = await ethers.getContractFactory("EIP777Token");
    token = await EIP777Token.deploy("MyEIP777Token", "M777", []);
    await token.waitForDeployment();
  });

  // Basic token information tests
  describe("Token Information", function() {
    it("should have correct name, symbol and initial total supply", async function () {
      expect(await token.name()).to.equal("MyEIP777Token");
      expect(await token.symbol()).to.equal("M777");
      expect(await token.totalSupply()).to.equal(0);
      
      console.log("Token Details:");
      console.log("  Name:", await token.name());
      console.log("  Symbol:", await token.symbol());
      console.log("  Initial Supply:", (await token.totalSupply()).toString());
    });

    it("should report zero balance for all accounts initially", async function () {
      expect(await token.balanceOf(owner.address)).to.equal(0);
      expect(await token.balanceOf(addr1.address)).to.equal(0);
      expect(await token.balanceOf(addr2.address)).to.equal(0);
      
      console.log("Initial Balances:");
      console.log("  Owner:", (await token.balanceOf(owner.address)).toString());
      console.log("  Addr1:", (await token.balanceOf(addr1.address)).toString());
      console.log("  Addr2:", (await token.balanceOf(addr2.address)).toString());
    });
  });

  // Tests for basic token operations
  describe("Basic Operations", function() {
    it("should not allow sending tokens without sufficient balance", async function () {
      await expect(token.send(addr1.address, 100, "0x"))
        .to.be.revertedWith("ERC777: insufficient balance");
    });

    it("should not allow burning tokens without sufficient balance", async function () {
      await expect(token.burn(50, "0x"))
        .to.be.revertedWith("ERC777: insufficient balance");
    });
  });

  // Tests for operator functionality
  describe("Operator Management", function() {
    it("should correctly handle operator authorization and revocation", async function () {
      // Check initial states
      expect(await token.isOperatorFor(owner.address, owner.address)).to.be.true;
      expect(await token.isOperatorFor(addr1.address, owner.address)).to.be.false;
      
      // Test operator authorization
      await token.connect(owner).authorizeOperator(addr1.address);
      expect(await token.isOperatorFor(addr1.address, owner.address)).to.be.true;
      
      // Test operator revocation
      await token.connect(owner).revokeOperator(addr1.address);
      expect(await token.isOperatorFor(addr1.address, owner.address)).to.be.false;
    });

    it("should prevent self-authorization as operator", async function () {
      await expect(token.authorizeOperator(owner.address))
        .to.be.revertedWith("ERC777: authorizing self as operator");
    });

    it("should prevent self-revocation as operator", async function () {
      await expect(token.revokeOperator(owner.address))
        .to.be.revertedWith("ERC777: revoking self as operator");
    });

    it("should maintain correct list of default operators", async function () {
      const defaults = await token.defaultOperators();
      expect(defaults.length).to.equal(0);
      console.log("Default operators:", defaults);
    });
  });

  // Tests for operator actions
  describe("Operator Actions", function() {
    it("should prevent unauthorized operator send", async function () {
      const initialBalance = ethers.parseUnits("1000", 18);
      await setBalance(token.target, owner.address, initialBalance);
      
      await expect(
        token.connect(addr2).operatorSend(owner.address, addr1.address, 100, "0x", "0x")
      ).to.be.revertedWith("ERC777: caller is not an operator for holder");
    });

    it("should prevent unauthorized operator burn", async function () {
      const initialBalance = ethers.parseUnits("1000", 18);
      await setBalance(token.target, owner.address, initialBalance);
      
      await expect(
        token.connect(addr2).operatorBurn(owner.address, 50, "0x", "0x")
      ).to.be.revertedWith("ERC777: caller is not an operator for holder");
    });
  });

  // Tests for successful operator operations
  describe("Successful Operator Operations", function () {
    beforeEach(async function () {
      // Set up initial balance and total supply for testing
      const initialBalance = ethers.parseUnits("1000", 18);
      await setBalance(token.target, owner.address, initialBalance);
      await setTotalSupply(token.target, initialBalance);
    });

    it("should allow authorized operator to send tokens", async function () {
      // Authorize addr1 as an operator
      await token.connect(owner).authorizeOperator(addr1.address);

      // Record initial balances
      const ownerBalanceBefore = await token.balanceOf(owner.address);
      const addr2BalanceBefore = await token.balanceOf(addr2.address);
      
      console.log("Initial state:");
      console.log("  Owner balance:", ownerBalanceBefore.toString());
      console.log("  Recipient balance:", addr2BalanceBefore.toString());

      // Perform operator send
      const sendAmount = 100;
      await token.connect(addr1).operatorSend(
        owner.address,
        addr2.address,
        sendAmount,
        "0x",
        "0x"
      );

      // Verify final balances
      const ownerBalanceAfter = await token.balanceOf(owner.address);
      const addr2BalanceAfter = await token.balanceOf(addr2.address);
      
      console.log("Final state:");
      console.log("  Owner balance:", ownerBalanceAfter.toString());
      console.log("  Recipient balance:", addr2BalanceAfter.toString());

      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore - BigInt(sendAmount));
      expect(addr2BalanceAfter).to.equal(addr2BalanceBefore + BigInt(sendAmount));
    });

    it("should allow authorized operator to burn tokens", async function () {
      // Authorize addr1 as an operator
      await token.connect(owner).authorizeOperator(addr1.address);

      // Record initial state
      const totalSupplyBefore = await token.totalSupply();
      const ownerBalanceBefore = await token.balanceOf(owner.address);
      
      console.log("Initial state:");
      console.log("  Total supply:", totalSupplyBefore.toString());
      console.log("  Owner balance:", ownerBalanceBefore.toString());

      // Perform operator burn
      const burnAmount = 200;
      await token.connect(addr1).operatorBurn(
        owner.address,
        burnAmount,
        "0x",
        "0x"
      );

      // Verify final state
      const totalSupplyAfter = await token.totalSupply();
      const ownerBalanceAfter = await token.balanceOf(owner.address);
      
      console.log("Final state:");
      console.log("  Total supply:", totalSupplyAfter.toString());
      console.log("  Owner balance:", ownerBalanceAfter.toString());

      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore - BigInt(burnAmount));
      expect(totalSupplyAfter).to.equal(totalSupplyBefore - BigInt(burnAmount));
    });
  });
});

describe("ERC777Token Hooks", function () {
  let token, sender, recipient, nonImplementingContract;
  let owner, addr1, addr2;
  const expectedRegistryAddress = "0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC1820 registry
    const MockERC1820 = await ethers.getContractFactory("MockERC1820Registry");
    const mockRegistry = await MockERC1820.deploy();
    await mockRegistry.waitForDeployment();

    // Inject mock registry at the standard address
    const mockRegistryBytecode = await ethers.provider.getCode(mockRegistry.target);
    await ethers.provider.send("hardhat_setCode", [
      expectedRegistryAddress,
      mockRegistryBytecode,
    ]);
    await ethers.provider.send("evm_mine", []);

    // Deploy the ERC777 token
    const Token = await ethers.getContractFactory("EIP777Token");
    token = await Token.deploy("TestToken", "TTK", []);
    await token.waitForDeployment();

    // Deploy a mock ERC777Sender
    const MockSender = await ethers.getContractFactory("MockERC777Sender");
    sender = await MockSender.deploy();
    await sender.waitForDeployment();

    // Deploy a mock ERC777Recipient
    const MockRecipient = await ethers.getContractFactory("MockERC777Recipient");
    recipient = await MockRecipient.deploy();
    await recipient.waitForDeployment();

    // Deploy a contract that doesn't implement the hooks
    const NonImplementingContract = await ethers.getContractFactory("NonImplementingContract");
    nonImplementingContract = await NonImplementingContract.deploy();
    await nonImplementingContract.waitForDeployment();

    // Set up initial balances for testing
    const initialBalance = ethers.parseUnits("1000", 18);
    await setBalance(token.target, owner.address, initialBalance);
    await setTotalSupply(token.target, initialBalance);
    
    console.log("Initial setup: Owner balance:", ethers.formatEther(await token.balanceOf(owner.address)), "TTK");
  });

  // Helper function to log balances
  async function logBalances(message) {
    const ownerBalance = await token.balanceOf(owner.address);
    const addr1Balance = await token.balanceOf(addr1.address);
    const addr2Balance = await token.balanceOf(addr2.address);
    const senderBalance = await token.balanceOf(sender.target);
    const recipientBalance = await token.balanceOf(recipient.target);
    const nonImplBalance = await token.balanceOf(nonImplementingContract.target);
    
    console.log("\n=== BALANCES:", message, "===");
    console.log("Owner:", ethers.formatEther(ownerBalance), "TTK");
    console.log("Addr1:", ethers.formatEther(addr1Balance), "TTK");
    console.log("Addr2:", ethers.formatEther(addr2Balance), "TTK");
    console.log("Sender Contract:", ethers.formatEther(senderBalance), "TTK");
    console.log("Recipient Contract:", ethers.formatEther(recipientBalance), "TTK");
    console.log("NonImplementing Contract:", ethers.formatEther(nonImplBalance), "TTK");
    console.log("Total:", ethers.formatEther(
      ownerBalance + addr1Balance + addr2Balance + 
      senderBalance + recipientBalance + nonImplBalance
    ), "TTK");
    console.log("==============================\n");
    
    return {
      owner: ownerBalance,
      addr1: addr1Balance,
      addr2: addr2Balance,
      sender: senderBalance,
      recipient: recipientBalance,
      nonImpl: nonImplBalance
    };
  }

  describe("Hook behavior for tokens sent to contracts", function() {
    it("should call tokensReceived when sending to a registered recipient", async function() {
      const amount = ethers.parseUnits("100", 18);
      
      // Check and log balances before
      console.log("Test: sending to registered recipient");
      const balancesBefore = await logBalances("Before sending to registered recipient");
      
      // Send tokens to the recipient that implements the hook
      console.log(`Sending ${ethers.formatEther(amount)} TTK from owner to recipient contract`);
      const tx = await token.connect(owner).send(recipient.target, amount, "0x1234");
      
      // Check and log balances after
      const balancesAfter = await logBalances("After sending to registered recipient");
      
      // Log the deltas
      console.log("Balance changes:");
      console.log("Owner:", ethers.formatEther(balancesAfter.owner - balancesBefore.owner), "TTK");
      console.log("Recipient:", ethers.formatEther(balancesAfter.recipient - balancesBefore.recipient), "TTK");
      
      // Verify the correct balance changes
      expect(balancesAfter.owner).to.equal(balancesBefore.owner - amount);
      expect(balancesAfter.recipient).to.equal(balancesBefore.recipient + amount);
      
      // Verify the event was emitted by the recipient indicating hook was called
      await expect(tx)
        .to.emit(recipient, "TokensReceived")
        .withArgs(owner.address, owner.address, recipient.target, amount, "0x1234", "0x");
    });

    it("should successfully send tokens to a non-implementing contract", async function() {
      const amount = ethers.parseUnits("100", 18);
      
      // Check and log balances before
      console.log("Test: sending to non-implementing contract");
      const balancesBefore = await logBalances("Before sending to non-implementing contract");
      
      // Send tokens to contract without hook implementation
      console.log(`Sending ${ethers.formatEther(amount)} TTK from owner to non-implementing contract`);
      await token.connect(owner).send(nonImplementingContract.target, amount, "0x");
      
      // Check and log balances after
      const balancesAfter = await logBalances("After sending to non-implementing contract");
      
      // Log the deltas
      console.log("Balance changes:");
      console.log("Owner:", ethers.formatEther(balancesAfter.owner - balancesBefore.owner), "TTK");
      console.log("NonImplementing:", ethers.formatEther(balancesAfter.nonImpl - balancesBefore.nonImpl), "TTK");
      
      // Verify the correct balance changes
      expect(balancesAfter.owner).to.equal(balancesBefore.owner - amount);
      expect(balancesAfter.nonImpl).to.equal(balancesBefore.nonImpl + amount);
    });

    it("should revert if recipient's tokensReceived implementation reverts", async function() {
      const amount = ethers.parseUnits("100", 18);
      
      // Make the recipient revert when receiving tokens
      await recipient.setShouldRevert(true);
      console.log("Test: recipient contract configured to revert on token receipt");
      
      // Check and log balances before
      const balancesBefore = await logBalances("Before attempting to send to reverting recipient");
      
      // Expect the send to revert
      console.log(`Attempting to send ${ethers.formatEther(amount)} TTK from owner to recipient contract (should revert)`);
      await expect(
        token.connect(owner).send(recipient.target, amount, "0x")
      ).to.be.reverted;
      
      // Check and log balances after
      const balancesAfter = await logBalances("After attempted send to reverting recipient");
      
      // Log comparisons
      console.log("Balances should be unchanged");
      console.log("Owner balance equal:", balancesAfter.owner.toString() === balancesBefore.owner.toString());
      console.log("Recipient balance equal:", balancesAfter.recipient.toString() === balancesBefore.recipient.toString());
      
      // Verify balances remained unchanged
      expect(balancesAfter.owner).to.equal(balancesBefore.owner);
      expect(balancesAfter.recipient).to.equal(balancesBefore.recipient);
    });
  });
  
  describe("Hook behavior for tokens sent from contracts", function() {
    beforeEach(async function() {
      // Give the sender contract some tokens to test sending hooks
      const amount = ethers.parseUnits("500", 18);
      console.log(`Setting up: Sending ${ethers.formatEther(amount)} TTK from owner to sender contract`);
      await token.connect(owner).send(sender.target, amount, "0x");
      await logBalances("After giving tokens to sender contract");
    });
    
    it("should call tokensToSend when sending from a registered sender", async function() {
      const amount = ethers.parseUnits("100", 18);
      
      // Check and log balances before
      console.log("Test: sending from registered sender contract");
      const balancesBefore = await logBalances("Before sending from sender contract");
      
      // Call sender contract function that triggers a token send
      console.log(`Instructing sender contract to send ${ethers.formatEther(amount)} TTK to addr1`);
      const tx = await sender.sendTokens(token.target, addr1.address, amount);
      
      // Check and log balances after
      const balancesAfter = await logBalances("After sending from sender contract");
      
      // Log the deltas
      console.log("Balance changes:");
      console.log("Sender contract:", ethers.formatEther(balancesAfter.sender - balancesBefore.sender), "TTK");
      console.log("Addr1:", ethers.formatEther(balancesAfter.addr1 - balancesBefore.addr1), "TTK");
      
      // Verify balance changes
      expect(balancesAfter.sender).to.equal(balancesBefore.sender - amount);
      expect(balancesAfter.addr1).to.equal(balancesBefore.addr1 + amount);
      
      // Verify the event was emitted indicating hook was called
      await expect(tx)
        .to.emit(sender, "TokensToSend")
        .withArgs(sender.target, sender.target, addr1.address, amount, "0x3078", "0x");
    });
    
    it("should revert if sender's tokensToSend implementation reverts", async function() {
      const amount = ethers.parseUnits("100", 18);
      
      // Check and log balances before
      console.log("Test: sender contract configured to revert");
      const balancesBefore = await logBalances("Before attempting to send from reverting sender");
      
      // Make the sender revert when sending tokens
      await sender.setShouldRevert(true);
      console.log("Sender contract configured to revert on token send");
      
      // Expect the send to revert
      console.log(`Attempting to have sender contract send ${ethers.formatEther(amount)} TTK (should revert)`);
      await expect(
        sender.sendTokens(token.target, addr1.address, amount)
      ).to.be.reverted;
      
      // Check and log balances after
      const balancesAfter = await logBalances("After attempted send from reverting sender");
      
      // Log comparisons
      console.log("Balances should be unchanged");
      console.log("Sender balance equal:", balancesAfter.sender.toString() === balancesBefore.sender.toString());
      console.log("Addr1 balance equal:", balancesAfter.addr1.toString() === balancesBefore.addr1.toString());
      
      // Verify balances remained unchanged
      expect(balancesAfter.sender).to.equal(balancesBefore.sender);
      expect(balancesAfter.addr1).to.equal(balancesBefore.addr1);
    });
    
    it("should revert when sending to zero address", async function() {
      const amount = ethers.parseUnits("100", 18);
      const zeroAddress = "0x0000000000000000000000000000000000000000";
      
      // Check and log balances before
      console.log("Test: attempting to send to zero address");
      const balancesBefore = await logBalances("Before attempting to send to zero address");
      
      // Expect the send to revert when recipient is zero address
      console.log(`Attempting to have sender contract send ${ethers.formatEther(amount)} TTK to zero address (should revert)`);
      await expect(
        sender.sendTokens(token.target, zeroAddress, amount)
      ).to.be.reverted;
      
      // Check and log balances after
      const balancesAfter = await logBalances("After attempted send to zero address");
      
      // Log comparisons
      console.log("Balances should be unchanged");
      console.log("Sender balance equal:", balancesAfter.sender.toString() === balancesBefore.sender.toString());
      
      // Verify sender balance unchanged
      expect(balancesAfter.sender).to.equal(balancesBefore.sender);
    });
    
    it("should revert when sending more than balance", async function() {
      // Check and log balances before
      console.log("Test: attempting to send more than balance");
      const balancesBefore = await logBalances("Before attempting to send more than balance");
      
      const currentBalance = await token.balanceOf(sender.target);
      const excessAmount = currentBalance + ethers.parseUnits("1", 18);
      
      // Expect the send to revert due to insufficient balance
      console.log(`Sender contract balance: ${ethers.formatEther(currentBalance)} TTK`);
      console.log(`Attempting to send ${ethers.formatEther(excessAmount)} TTK (exceeds balance, should revert)`);
      await expect(
        sender.sendTokens(token.target, addr1.address, excessAmount)
      ).to.be.reverted;
      
      // Check and log balances after
      const balancesAfter = await logBalances("After attempted send of excess amount");
      
      // Log comparisons
      console.log("Balances should be unchanged");
      console.log("Sender balance equal:", balancesAfter.sender.toString() === balancesBefore.sender.toString());
      console.log("Addr1 balance equal:", balancesAfter.addr1.toString() === balancesBefore.addr1.toString());
      
      // Verify balances unchanged
      expect(balancesAfter.sender).to.equal(balancesBefore.sender);
      expect(balancesAfter.addr1).to.equal(balancesBefore.addr1);
    });
  });
  
  describe("Hook behavior for EOA transfers", function() {
    it("should successfully send tokens between EOAs with no hooks", async function() {
      const amount = ethers.parseUnits("100", 18);
      
      // Check and log balances before
      console.log("Test: sending between EOAs (no hooks)");
      const balancesBefore = await logBalances("Before sending between EOAs");
      
      // Regular transfer between EOAs
      console.log(`Sending ${ethers.formatEther(amount)} TTK from owner to addr1`);
      await token.connect(owner).send(addr1.address, amount, "0x");
      
      // Check and log balances after
      const balancesAfter = await logBalances("After sending between EOAs");
      
      // Log the deltas
      console.log("Balance changes:");
      console.log("Owner:", ethers.formatEther(balancesAfter.owner - balancesBefore.owner), "TTK");
      console.log("Addr1:", ethers.formatEther(balancesAfter.addr1 - balancesBefore.addr1), "TTK");
      
      // Verify balance changes
      expect(balancesAfter.owner).to.equal(balancesBefore.owner - amount);
      expect(balancesAfter.addr1).to.equal(balancesBefore.addr1 + amount);
    });
    
    it("should revert when sending tokens with insufficient balance", async function() {
      // Check and log balances before
      console.log("Test: sending with insufficient balance");
      const balancesBefore = await logBalances("Before attempting to send with insufficient balance");
      
      const ownerBalance = await token.balanceOf(owner.address);
      const excessAmount = ownerBalance + ethers.parseUnits("1", 18);
      
      // Expect send to revert when amount exceeds balance
      console.log(`Owner balance: ${ethers.formatEther(ownerBalance)} TTK`);
      console.log(`Attempting to send ${ethers.formatEther(excessAmount)} TTK (exceeds balance, should revert)`);
      await expect(
        token.connect(owner).send(addr1.address, excessAmount, "0x")
      ).to.be.reverted;
      
      // Check and log balances after
      const balancesAfter = await logBalances("After attempted send with insufficient balance");
      
      // Log comparisons
      console.log("Balances should be unchanged");
      console.log("Owner balance equal:", balancesAfter.owner.toString() === balancesBefore.owner.toString());
      console.log("Addr1 balance equal:", balancesAfter.addr1.toString() === balancesBefore.addr1.toString());
      
      // Verify balances unchanged
      expect(balancesAfter.owner).to.equal(balancesBefore.owner);
      expect(balancesAfter.addr1).to.equal(balancesBefore.addr1);
    });
    
    it("should revert when attempting to send from unauthorized accounts", async function() {
      const amount = ethers.parseUnits("100", 18);
      
      // Check and log balances before
      console.log("Test: sending from unauthorized account");
      const balancesBefore = await logBalances("Before attempting to send from unauthorized account");
      
      // Attempt to send tokens from an account that doesn't have them
      console.log(`Addr2 balance: ${ethers.formatEther(await token.balanceOf(addr2.address))} TTK`);
      console.log(`Attempting to send ${ethers.formatEther(amount)} TTK from addr2 (should revert)`);
      await expect(
        token.connect(addr2).send(addr1.address, amount, "0x")
      ).to.be.reverted;
      
      // Check and log balances after
      const balancesAfter = await logBalances("After attempted send from unauthorized account");
      
      // Log comparisons
      console.log("Balances should be unchanged");
      console.log("Addr1 balance equal:", balancesAfter.addr1.toString() === balancesBefore.addr1.toString());
      console.log("Addr2 balance equal:", balancesAfter.addr2.toString() === balancesBefore.addr2.toString());
      
      // Verify balances unchanged
      expect(balancesAfter.addr1).to.equal(balancesBefore.addr1);
      expect(balancesAfter.addr2).to.equal(balancesBefore.addr2);
    });
  });
  
  describe("Operator actions with hooks", function() {
    it("should invoke hooks when operator sends tokens", async function() {
      const amount = ethers.parseUnits("100", 18);
      
      // Check and log balances before
      console.log("Test: operator sending tokens");
      const balancesBefore = await logBalances("Before operator send");
      
      // Authorize addr1 as operator for owner
      console.log("Authorizing addr1 as operator for owner");
      await token.connect(owner).authorizeOperator(addr1.address);
      
      // Operator sends tokens to recipient with hook
      console.log(`Operator (addr1) sending ${ethers.formatEther(amount)} TTK from owner to recipient contract`);
      const tx = await token.connect(addr1).operatorSend(
        owner.address, 
        recipient.target, 
        amount, 
        "0x1234", 
        "0x5678"
      );
      
      // Check and log balances after
      const balancesAfter = await logBalances("After operator send");
      
      // Log the deltas
      console.log("Balance changes:");
      console.log("Owner:", ethers.formatEther(balancesAfter.owner - balancesBefore.owner), "TTK");
      console.log("Recipient:", ethers.formatEther(balancesAfter.recipient - balancesBefore.recipient), "TTK");
      
      // Verify balance changes
      expect(balancesAfter.owner).to.equal(balancesBefore.owner - amount);
      expect(balancesAfter.recipient).to.equal(balancesBefore.recipient + amount);
      
      // Verify the recipient hook was called with correct parameters
      await expect(tx)
        .to.emit(recipient, "TokensReceived")
        .withArgs(addr1.address, owner.address, recipient.target, amount, "0x1234", "0x5678");
    });
    
    it("should revert when unauthorized operator attempts to send tokens", async function() {
      const amount = ethers.parseUnits("100", 18);
      
      // Check and log balances before
      console.log("Test: unauthorized operator attempt");
      const balancesBefore = await logBalances("Before unauthorized operator attempt");
      
      // No authorization given to addr1 for this test
      console.log("No authorization given to addr1");
      
      // Expect operatorSend to revert without authorization
      console.log(`Unauthorized operator (addr1) attempting to send ${ethers.formatEther(amount)} TTK from owner (should revert)`);
      await expect(
        token.connect(addr1).operatorSend(
          owner.address, 
          recipient.target, 
          amount, 
          "0x", 
          "0x"
        )
      ).to.be.reverted;
      
      // Check and log balances after
      const balancesAfter = await logBalances("After unauthorized operator attempt");
      
      // Log comparisons
      console.log("Balances should be unchanged");
      console.log("Owner balance equal:", balancesAfter.owner.toString() === balancesBefore.owner.toString());
      console.log("Recipient balance equal:", balancesAfter.recipient.toString() === balancesBefore.recipient.toString());
      
      // Verify balances unchanged
      expect(balancesAfter.owner).to.equal(balancesBefore.owner);
      expect(balancesAfter.recipient).to.equal(balancesBefore.recipient);
    });
    
    it("should allow operator to be revoked and prevent further sends", async function() {
      const amount = ethers.parseUnits("100", 18);
      
      // Check and log balances before
      console.log("Test: operator revocation");
      const balancesBefore = await logBalances("Before operator revocation test");
      
      // First authorize addr1 as operator
      console.log("Authorizing addr1 as operator for owner");
      await token.connect(owner).authorizeOperator(addr1.address);
      
      // Then revoke authorization
      console.log("Revoking addr1 as operator for owner");
      await token.connect(owner).revokeOperator(addr1.address);
      
      // Expect operatorSend to revert after revocation
      console.log(`Revoked operator (addr1) attempting to send ${ethers.formatEther(amount)} TTK from owner (should revert)`);
      await expect(
        token.connect(addr1).operatorSend(
          owner.address, 
          recipient.target, 
          amount, 
          "0x", 
          "0x"
        )
      ).to.be.reverted;
      
      // Check and log balances after
      const balancesAfter = await logBalances("After operator revocation test");
      
      // Log comparisons
      console.log("Balances should be unchanged");
      console.log("Owner balance equal:", balancesAfter.owner.toString() === balancesBefore.owner.toString());
      console.log("Recipient balance equal:", balancesAfter.recipient.toString() === balancesBefore.recipient.toString());
      
      // Verify balances unchanged
      expect(balancesAfter.owner).to.equal(balancesBefore.owner);
      expect(balancesAfter.recipient).to.equal(balancesBefore.recipient);
    });
  });
  
  describe("System behavior and compatibility tests", function() {
    it("should successfully handle sending to multiple different types of recipients", async function() {
      const amount = ethers.parseUnits("50", 18);
      
      // Check and log balances before
      console.log("Test: sending to multiple recipient types");
      const balancesBefore = await logBalances("Before sending to multiple recipients");
      
      // Send to EOA, implementing contract, and non-implementing contract
      console.log(`Sending ${ethers.formatEther(amount)} TTK to EOA (addr1)`);
      await token.connect(owner).send(addr1.address, amount, "0x01");
      
      console.log(`Sending ${ethers.formatEther(amount)} TTK to recipient contract`);
      await token.connect(owner).send(recipient.target, amount, "0x02");
      
      console.log(`Sending ${ethers.formatEther(amount)} TTK to non-implementing contract`);
      await token.connect(owner).send(nonImplementingContract.target, amount, "0x03");
      
      // Check and log balances after
      const balancesAfter = await logBalances("After sending to multiple recipients");
      
      // Log the deltas
      console.log("Balance changes:");
      console.log("Owner:", ethers.formatEther(balancesAfter.owner - balancesBefore.owner), "TTK");
      console.log("Addr1:", ethers.formatEther(balancesAfter.addr1 - balancesBefore.addr1), "TTK");
      console.log("Recipient:", ethers.formatEther(balancesAfter.recipient - balancesBefore.recipient), "TTK");
      console.log("NonImplementing:", ethers.formatEther(balancesAfter.nonImpl - balancesBefore.nonImpl), "TTK");
      
      // Verify all balance changes
      expect(balancesAfter.owner).to.equal(balancesBefore.owner - (amount * BigInt(3)));
      expect(balancesAfter.addr1).to.equal(balancesBefore.addr1 + amount);
      expect(balancesAfter.recipient).to.equal(balancesBefore.recipient + amount);
      expect(balancesAfter.nonImpl).to.equal(balancesBefore.nonImpl + amount);
    });
    
    it("should respect granular operator permissions", async function() {
      // Check and log balances before
      console.log("Test: granular operator permissions");
      const balancesBefore = await logBalances("Before granular permissions test");
      
      // Setup operator permissions
      console.log("Authorizing addr1 as operator for owner only");
      await token.connect(owner).authorizeOperator(addr1.address);
      
      const amount = ethers.parseUnits("50", 18);
      
      // addr1 should be able to operate owner's tokens
      console.log(`Operator (addr1) sending ${ethers.formatEther(amount)} TTK from owner to recipient contract`);
      await token.connect(addr1).operatorSend(
        owner.address, 
        recipient.target, 
        amount, 
        "0x", 
        "0x"
      );
      
      // Log intermediate balances
      const balancesIntermediate = await logBalances("After authorized operator send");
      
      // addr1 should not be able to operate addr2's tokens
      console.log(`Operator (addr1) attempting to send from addr2 (should revert)`);
      await expect(
        token.connect(addr1).operatorSend(
          addr2.address, 
          recipient.target, 
          amount, 
          "0x", 
          "0x"
        )
      ).to.be.reverted;
      
      // Check and log balances after
      const balancesAfter = await logBalances("After attempted unauthorized operator send");
      
      // Log delta comparisons
      console.log("Balance changes from start:");
      console.log("Owner:", ethers.formatEther(balancesAfter.owner - balancesBefore.owner), "TTK");
      console.log("Recipient:", ethers.formatEther(balancesAfter.recipient - balancesBefore.recipient), "TTK");
      
      // Verify expected changes
      expect(balancesAfter.owner).to.equal(balancesBefore.owner - amount);
      expect(balancesAfter.recipient).to.equal(balancesBefore.recipient + amount);
      expect(balancesAfter.addr2).to.equal(balancesBefore.addr2); // addr2 balance unchanged
    });
    
    it("should enforce EIP777 semantics when interacting with other contracts", async function() {
      // Give tokens to sender contract
      const fundAmount = ethers.parseUnits("100", 18);
      console.log(`Funding sender contract with ${ethers.formatEther(fundAmount)} TTK`);
      await token.connect(owner).send(sender.target, fundAmount, "0x");
      
      // Check and log balances before
      console.log("Test: EIP777 semantics with contract interactions");
      const balancesBefore = await logBalances("After funding sender contract");
      
      // Test sending to recipient contract that's revert-configured
      console.log("Configuring recipient contract to revert");
      await recipient.setShouldRevert(true);
      
      // This should fail because recipient contract reverts
      console.log("Attempting send from sender to reverting recipient (should revert)");
      await expect(
        sender.sendTokens(token.target, recipient.target, ethers.parseUnits("10", 18))
      ).to.be.reverted;
      
      // Check intermediate balances
      const balancesIntermediate1 = await logBalances("After attempted send to reverting recipient");
      
      // Verify intermediate balances unchanged
      expect(balancesIntermediate1.sender).to.equal(balancesBefore.sender);
      expect(balancesIntermediate1.recipient).to.equal(balancesBefore.recipient);
      
      // Reset recipient
      console.log("Resetting recipient to not revert");
      await recipient.setShouldRevert(false);
      
      // Make sender revert
      console.log("Configuring sender contract to revert");
      await sender.setShouldRevert(true);
      
      // This should fail because sender contract reverts
      console.log("Attempting send from reverting sender (should revert)");
      await expect(
        sender.sendTokens(token.target, addr1.address, ethers.parseUnits("10", 18))
      ).to.be.reverted;
      
      // Check and log final balances
      const balancesAfter = await logBalances("After all attempts");
      
      // Verify final balances unchanged from initial state
      expect(balancesAfter.sender).to.equal(balancesBefore.sender);
      expect(balancesAfter.recipient).to.equal(balancesBefore.recipient);
      expect(balancesAfter.addr1).to.equal(balancesBefore.addr1);
    });
  });
});