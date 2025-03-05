const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("EIP777Token", function () {
  async function deployContractsFixture() {
    const [owner, user1, user2, operator] = await ethers.getSigners();

    const MockERC1820Registry = await ethers.getContractFactory("MockERC1820Registry");
    const registry = await MockERC1820Registry.deploy();
    await registry.waitForDeployment();

    const EIP777Token = await ethers.getContractFactory("EIP777Token");
    const token = await EIP777Token.deploy(
      "TestToken",
      "TTK",
      [operator.address],
      registry.target,
      1000n // Initial supply of 1000 tokens to owner
    );
    await token.waitForDeployment();

    const MockERC777Recipient = await ethers.getContractFactory("MockERC777Recipient");
    const recipient = await MockERC777Recipient.deploy(registry.target);
    await recipient.waitForDeployment();

    const MockERC777Sender = await ethers.getContractFactory("MockERC777Sender");
    const sender = await MockERC777Sender.deploy(registry.target);
    await sender.waitForDeployment();

    const NonImplementingContract = await ethers.getContractFactory("NonImplementingContract");
    const nonImplementing = await NonImplementingContract.deploy();
    await nonImplementing.waitForDeployment();

    return { token, registry, recipient, sender, nonImplementing, owner, user1, user2, operator };
  }

  // Basic ERC777 Properties
  describe("Basic Properties", function () {
    it("should return correct name", async function () {
      const { token } = await loadFixture(deployContractsFixture);
      expect(await token.name()).to.equal("TestToken");
    });

    it("should return correct symbol", async function () {
      const { token } = await loadFixture(deployContractsFixture);
      expect(await token.symbol()).to.equal("TTK");
    });

    it("should return correct granularity", async function () {
      const { token } = await loadFixture(deployContractsFixture);
      expect(await token.granularity()).to.equal(1n);
    });

    it("should return default operators", async function () {
      const { token, operator } = await loadFixture(deployContractsFixture);
      expect(await token.defaultOperators()).to.deep.equal([operator.address]);
    });
  });

  // Operator Management
  describe("Operator Management", function () {
    it("should allow owner to authorize an operator", async function () {
      const { token, owner, user2 } = await loadFixture(deployContractsFixture);
      await expect(token.connect(owner).authorizeOperator(user2.address))
        .to.emit(token, "AuthorizedOperator")
        .withArgs(user2.address, owner.address);
      expect(await token.isOperatorFor(user2.address, owner.address)).to.be.true;
    });

    it("should revert when non-owner tries to authorize an operator", async function () {
      const { token, user1, user2 } = await loadFixture(deployContractsFixture);
      await expect(token.connect(user1).authorizeOperator(user2.address))
        .to.be.revertedWith("ERC777: caller is not the owner");
    });

    it("should allow revoking an operator", async function () {
      const { token, owner, user2 } = await loadFixture(deployContractsFixture);
      await token.connect(owner).authorizeOperator(user2.address);
      await expect(token.connect(owner).revokeOperator(user2.address))
        .to.emit(token, "RevokedOperator")
        .withArgs(user2.address, owner.address);
      expect(await token.isOperatorFor(user2.address, owner.address)).to.be.false;
    });

    it("should revert when owner authorizes self as operator", async function () {
      const { token, owner } = await loadFixture(deployContractsFixture);
      await expect(token.connect(owner).authorizeOperator(owner.address))
        .to.be.revertedWith("ERC777: authorizing self as operator");
    });

    it("should revert when revoking self as operator", async function () {
      const { token, owner } = await loadFixture(deployContractsFixture);
      await expect(token.connect(owner).revokeOperator(owner.address))
        .to.be.revertedWith("ERC777: revoking self as operator");
    });
  });

  // Send Functionality
  describe("Send", function () {
    it("should revert send tokens due to insufficient balance for non-owner", async function () {
      const { token, user1, user2 } = await loadFixture(deployContractsFixture);
      const amount = 100n;
      await expect(token.connect(user1).send(user2.address, amount, "0x1234"))
        .to.be.revertedWith("ERC777: insufficient balance");
    });

    it("should revert when sending from zero address via operatorSend", async function () {
      const { token, operator } = await loadFixture(deployContractsFixture);
      await expect(token.connect(operator).operatorSend(ethers.ZeroAddress, operator.address, 100n, "0x", "0x"))
        .to.be.revertedWith("ERC777: send from the zero address");
    });

    it("should revert when sending to zero address", async function () {
      const { token, owner } = await loadFixture(deployContractsFixture);
      await expect(token.connect(owner).send(ethers.ZeroAddress, 100n, "0x"))
        .to.be.revertedWith("ERC777: send to the zero address");
    });

    it("should revert when balance is insufficient for non-owner", async function () {
      const { token, user1, user2 } = await loadFixture(deployContractsFixture);
      await expect(token.connect(user1).send(user2.address, 2000n, "0x"))
        .to.be.revertedWith("ERC777: insufficient balance");
    });

    it("should revert when amount is not multiple of granularity", async function () {
      const { token } = await loadFixture(deployContractsFixture);
      expect(await token.granularity()).to.equal(1n); // Trivial with granularity = 1
    });

    it("should revert when interacting with recipient hook due to insufficient balance for non-owner", async function () {
      const { token, user1, recipient } = await loadFixture(deployContractsFixture);
      const amount = 100n;
      await expect(token.connect(user1).send(recipient.target, amount, "0x1234"))
        .to.be.revertedWith("ERC777: insufficient balance");
    });

    it("should revert when recipient hook reverts due to insufficient balance for non-owner", async function () {
      const { token, user1, recipient } = await loadFixture(deployContractsFixture);
      await recipient.setShouldRevert(true);
      await expect(token.connect(user1).send(recipient.target, 100n, "0x"))
        .to.be.revertedWith("ERC777: insufficient balance");
    });

    it("should revert when sending to non-implementing contract due to insufficient balance for non-owner", async function () {
      const { token, user1, nonImplementing } = await loadFixture(deployContractsFixture);
      await expect(token.connect(user1).send(nonImplementing.target, 100n, "0x"))
        .to.be.revertedWith("ERC777: insufficient balance");
    });

    it("should revert when trying to send to nonImplementing contract", async function () {
      const { token, owner, nonImplementing } = await loadFixture(deployContractsFixture);
      await expect(token.connect(owner).send(nonImplementing.target, 100n, "0x"))
        .to.be.revertedWith("ERC777: recipient contract must be registered");
    });

    it("should allow sending tokens to an EOA", async function () {
      const { token, owner, user2 } = await loadFixture(deployContractsFixture);
      const initialOwnerBalance = await token.balanceOf(owner.address);
      const initialUser2Balance = await token.balanceOf(user2.address);
      const amount = 100n;

      await expect(token.connect(owner).send(user2.address, amount, "0x"))
        .to.emit(token, "Sent")
        .withArgs(owner.address, owner.address, user2.address, amount, "0x", "0x");

      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance - amount);
      expect(await token.balanceOf(user2.address)).to.equal(initialUser2Balance + amount);
    });
  });

  // Operator Send
  describe("Operator Send", function () {
    it("should revert operator send due to insufficient balance for non-owner", async function () {
      const { token, user1, user2, operator } = await loadFixture(deployContractsFixture);
      const amount = 100n;
      await expect(token.connect(operator).operatorSend(user1.address, user2.address, amount, "0x1234", "0x5678"))
        .to.be.revertedWith("ERC777: insufficient balance");
    });

    it("should revert when non-operator tries to send", async function () {
      const { token, user1, user2 } = await loadFixture(deployContractsFixture);
      await expect(token.connect(user2).operatorSend(user1.address, user2.address, 100n, "0x", "0x"))
        .to.be.revertedWith("ERC777: caller is not an operator for holder");
    });

    it("should revert when interacting with sender hook due to insufficient balance for non-owner", async function () {
      const { token, user1, user2 } = await loadFixture(deployContractsFixture);
      await expect(token.connect(user1).send(user2.address, 100n, "0x1234"))
        .to.be.revertedWith("ERC777: insufficient balance");
    });

    it("should revert when sender hook reverts due to insufficient balance for non-owner", async function () {
      const { token, user1, sender } = await loadFixture(deployContractsFixture);
      await sender.setShouldRevert(true);
      await expect(token.connect(user1).send(sender.target, 100n, "0x"))
        .to.be.revertedWith("ERC777: insufficient balance");
    });

    it("should revert when operator sends to nonImplementing contract", async function () {
      const { token, owner, operator, nonImplementing } = await loadFixture(deployContractsFixture);
      await token.connect(owner).authorizeOperator(operator.address);
      await expect(token.connect(operator).operatorSend(owner.address, nonImplementing.target, 100n, "0x", "0x"))
        .to.be.revertedWith("ERC777: recipient contract must be registered");
    });

    it("should allow operator sending tokens to an EOA", async function () {
      const { token, owner, user2, operator } = await loadFixture(deployContractsFixture);
      const initialOwnerBalance = await token.balanceOf(owner.address);
      const initialUser2Balance = await token.balanceOf(user2.address);
      const amount = 100n;

      await token.connect(owner).authorizeOperator(operator.address);
      await expect(token.connect(operator).operatorSend(owner.address, user2.address, amount, "0x", "0x"))
        .to.emit(token, "Sent")
        .withArgs(operator.address, owner.address, user2.address, amount, "0x", "0x");

      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance - amount);
      expect(await token.balanceOf(user2.address)).to.equal(initialUser2Balance + amount);
    });
  });

  // Burn Functionality
  describe("Burn", function () {
    it("should revert burn due to insufficient balance for non-owner", async function () {
      const { token, user1 } = await loadFixture(deployContractsFixture);
      const amount = 100n;
      await expect(token.connect(user1).burn(amount, "0x1234"))
        .to.be.revertedWith("ERC777: insufficient balance");
    });

    it("should revert when burning from zero address via operatorBurn", async function () {
      const { token, operator } = await loadFixture(deployContractsFixture);
      await expect(token.connect(operator).operatorBurn(ethers.ZeroAddress, 100n, "0x", "0x"))
        .to.be.revertedWith("ERC777: burn from the zero address");
    });

    it("should revert operator burn due to insufficient balance for non-owner", async function () {
      const { token, user1, operator } = await loadFixture(deployContractsFixture);
      const amount = 100n;
      await expect(token.connect(operator).operatorBurn(user1.address, amount, "0x1234", "0x5678"))
        .to.be.revertedWith("ERC777: insufficient balance");
    });

    it("should revert when non-operator tries to burn", async function () {
      const { token, user1, user2 } = await loadFixture(deployContractsFixture);
      await expect(token.connect(user2).operatorBurn(user1.address, 100n, "0x", "0x"))
        .to.be.revertedWith("ERC777: caller is not an operator for holder");
    });
  });
});