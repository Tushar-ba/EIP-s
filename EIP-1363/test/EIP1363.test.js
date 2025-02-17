const {expect} = require ("chai");
const {ethers} = require ("hardhat");

describe("ERC1363Token", function () {
  let owner, addr1, addr2;
  let erc1363Token, receiverMock, spenderMock, dummyContract;
  const initialSupply = ethers.parseUnits("1000", 18);

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const ERC1363TokenFactory = await ethers.getContractFactory("ERC1363Token");
    erc1363Token = await ERC1363TokenFactory.deploy("Test Token", "TT", initialSupply);
    await erc1363Token.waitForDeployment();

    const ReceiverMockFactory = await ethers.getContractFactory("ERC1363ReceiverMock");
    receiverMock = await ReceiverMockFactory.deploy();
    await receiverMock.waitForDeployment();

    const SpenderMockFactory = await ethers.getContractFactory("ERC1363SpenderMock");
    spenderMock = await SpenderMockFactory.deploy();
    await spenderMock.waitForDeployment();

    const DummyContractFactory = await ethers.getContractFactory("DummyContract");
    dummyContract = await DummyContractFactory.deploy();
    await dummyContract.waitForDeployment();
  });

  describe("transferAndCall", function () {
    it("should transfer tokens and call onTransferReceived", async function () {
      const amount = ethers.parseUnits("100", 18);
      const tx = await erc1363Token.getFunction("transferAndCall(address,uint256,bytes)").send(receiverMock.target, amount, "0x");
      await tx.wait();

      const receiverBalance = await erc1363Token.balanceOf(receiverMock.target);
      expect(receiverBalance).to.equal(amount);
    });

    it("should fail when recipient does not implement onTransferReceived", async function () {
      const amount = ethers.parseUnits("50", 18);
      await expect(
        erc1363Token.getFunction("transferAndCall(address,uint256,bytes)").send(dummyContract.target, amount, "0x")
      ).to.be.revertedWith("ERC1363: transfer to non ERC1363Receiver implementer");
    });
  });

  describe("transferFromAndCall", function () {
    it("should transfer tokens from an approved account and call onTransferReceived", async function () {
      const amount = ethers.parseUnits("50", 18);
      const approveTx = await erc1363Token.approve(addr1.address, amount);
      await approveTx.wait();

      const erc1363TokenFromAddr1 = erc1363Token.connect(addr1);
      const tx = await erc1363TokenFromAddr1.getFunction("transferFromAndCall(address,address,uint256,bytes)").send(owner.address, receiverMock.target, amount, "0x");
      await tx.wait();

      const receiverBalance = await erc1363Token.balanceOf(receiverMock.target);
      expect(receiverBalance).to.equal(amount);
    });

    it("should fail when recipient does not implement onTransferReceived", async function () {
      const amount = ethers.parseUnits("30", 18);
      const approveTx = await erc1363Token.approve(addr1.address, amount);
      await approveTx.wait();

      const erc1363TokenFromAddr1 = erc1363Token.connect(addr1);
      await expect(
        erc1363TokenFromAddr1.getFunction("transferFromAndCall(address,address,uint256,bytes)").send(owner.address, dummyContract.target, amount, "0x")
      ).to.be.revertedWith("ERC1363: transfer to non ERC1363Receiver implementer");
    });
  });

  describe("approveAndCall", function () {
    it("should approve tokens and call onApprovalReceived", async function () {
      const amount = ethers.parseUnits("100", 18);
      const tx = await erc1363Token.getFunction("approveAndCall(address,uint256,bytes)").send(spenderMock.target, amount, "0x");
      await tx.wait();
    });

    it("should fail when spender does not implement onApprovalReceived", async function () {
      const amount = ethers.parseUnits("100", 18);
      await expect(
        erc1363Token.getFunction("approveAndCall(address,uint256,bytes)").send(dummyContract.target, amount, "0x")
      ).to.be.revertedWith("ERC1363: approve to non ERC1363Spender implementer");
    });
  });
});