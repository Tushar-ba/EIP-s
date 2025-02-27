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
  //const expectedRegistryAddress = "0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24"; only for mainnet

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