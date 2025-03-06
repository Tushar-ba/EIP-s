const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC1363Token", function () {
  let owner, addr1, addr2;
  let erc1363Token, receiverMock, spenderMock, dummyContract;
  const initialSupply = ethers.parseUnits("1000", 18);

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    console.log("\n--- Deploying Contracts ---");
    
    const ERC1363TokenFactory = await ethers.getContractFactory("ERC1363Token");
    erc1363Token = await ERC1363TokenFactory.deploy("Test Token", "TT", initialSupply);
    await erc1363Token.waitForDeployment();
    console.log("ERC1363Token deployed to:", await erc1363Token.getAddress());
    console.log("Initial supply:", ethers.formatEther(initialSupply), "TT");

    const ReceiverMockFactory = await ethers.getContractFactory("ERC1363ReceiverMock");
    receiverMock = await ReceiverMockFactory.deploy();
    await receiverMock.waitForDeployment();
    console.log("ReceiverMock deployed to:", await receiverMock.getAddress());

    const SpenderMockFactory = await ethers.getContractFactory("ERC1363SpenderMock");
    spenderMock = await SpenderMockFactory.deploy();
    await spenderMock.waitForDeployment();
    console.log("SpenderMock deployed to:", await spenderMock.getAddress());

    const DummyContractFactory = await ethers.getContractFactory("DummyContract");
    dummyContract = await DummyContractFactory.deploy();
    await dummyContract.waitForDeployment();
    console.log("DummyContract deployed to:", await dummyContract.getAddress());

    console.log("\nInitial balances:");
    console.log("Owner balance:", ethers.formatEther(await erc1363Token.balanceOf(owner.address)), "TT");
  });

  describe("transferAndCall", function () {
    it("should transfer tokens and call onTransferReceived", async function () {
      const amount = ethers.parseUnits("100", 18);
      console.log("\nTest: Transfer and call to ReceiverMock");
      console.log("Transfer amount:", ethers.formatEther(amount), "TT");

      // Log pre-transfer balances
      const preOwnerBalance = await erc1363Token.balanceOf(owner.address);
      const preReceiverBalance = await erc1363Token.balanceOf(receiverMock.target);
      console.log("\nPre-transfer balances:");
      console.log("Owner:", ethers.formatEther(preOwnerBalance), "TT");
      console.log("Receiver:", ethers.formatEther(preReceiverBalance), "TT");

      const tx = await erc1363Token.getFunction("transferAndCall(address,uint256,bytes)").send(receiverMock.target, amount, "0x");
      await tx.wait();

      // Log post-transfer balances
      const postOwnerBalance = await erc1363Token.balanceOf(owner.address);
      const postReceiverBalance = await erc1363Token.balanceOf(receiverMock.target);
      console.log("\nPost-transfer balances:");
      console.log("Owner:", ethers.formatEther(postOwnerBalance), "TT");
      console.log("Receiver:", ethers.formatEther(postReceiverBalance), "TT");
      console.log("Transfer successful!");

      expect(postReceiverBalance).to.equal(amount);
    });

    it("Should Toggel isTrue on transferAndCall",async function (){
      const amount = ethers.parseUnits("100", 18);
      const initialState = await receiverMock.isTrue();
      console.log(initialState);
      await erc1363Token.transferAndCall(receiverMock.target,amount);
      const ToggeledState = await receiverMock.isTrue();
      console.log(ToggeledState);
      expect(ToggeledState).to.be.true;
    })

    it("should fail when recipient does not implement onTransferReceived", async function () {
      const amount = ethers.parseUnits("50", 18);
      console.log("\nTest: Transfer and call to non-implementing contract (DummyContract)");
      console.log("Transfer amount:", ethers.formatEther(amount), "TT");

      // Log pre-attempt balances
      const preOwnerBalance = await erc1363Token.balanceOf(owner.address);
      const preReceiverBalance = await erc1363Token.balanceOf(dummyContract.target);
      console.log("\nPre-attempt balances:");
      console.log("Owner:", ethers.formatEther(preOwnerBalance), "TT");
      console.log("DummyContract:", ethers.formatEther(preReceiverBalance), "TT");

      await expect(
        erc1363Token.getFunction("transferAndCall(address,uint256,bytes)").send(dummyContract.target, amount, "0x")
      ).to.be.revertedWith("ERC1363: transfer to non ERC1363Receiver implementer");

      // Log post-attempt balances
      const postOwnerBalance = await erc1363Token.balanceOf(owner.address);
      const postReceiverBalance = await erc1363Token.balanceOf(dummyContract.target);
      console.log("\nPost-attempt balances (should be unchanged):");
      console.log("Owner:", ethers.formatEther(postOwnerBalance), "TT");
      console.log("DummyContract:", ethers.formatEther(postReceiverBalance), "TT");
      console.log("Transfer failed as expected!");
    });
  });

  describe("transferFromAndCall", function () {
    it("should transfer tokens from an approved account and call onTransferReceived", async function () {
      const amount = ethers.parseUnits("50", 18);
      console.log("\nTest: TransferFrom and call with approved account");
      console.log("Transfer amount:", ethers.formatEther(amount), "TT");

      // Log pre-approval balances
      console.log("\nPre-approval balances:");
      console.log("Owner:", ethers.formatEther(await erc1363Token.balanceOf(owner.address)), "TT");
      console.log("Addr1 allowance:", ethers.formatEther(await erc1363Token.allowance(owner.address, addr1.address)), "TT");

      const approveTx = await erc1363Token.approve(addr1.address, amount);
      await approveTx.wait();
      console.log("\nApproval completed");
      console.log("New addr1 allowance:", ethers.formatEther(await erc1363Token.allowance(owner.address, addr1.address)), "TT");

      // Log pre-transfer balances
      const preOwnerBalance = await erc1363Token.balanceOf(owner.address);
      const preReceiverBalance = await erc1363Token.balanceOf(receiverMock.target);
      console.log("\nPre-transfer balances:");
      console.log("Owner:", ethers.formatEther(preOwnerBalance), "TT");
      console.log("Receiver:", ethers.formatEther(preReceiverBalance), "TT");

      const erc1363TokenFromAddr1 = erc1363Token.connect(addr1);
      const tx = await erc1363TokenFromAddr1.getFunction("transferFromAndCall(address,address,uint256,bytes)").send(owner.address, receiverMock.target, amount, "0x");
      await tx.wait();

      // Log post-transfer balances
      const postOwnerBalance = await erc1363Token.balanceOf(owner.address);
      const postReceiverBalance = await erc1363Token.balanceOf(receiverMock.target);
      const postAllowance = await erc1363Token.allowance(owner.address, addr1.address);
      console.log("\nPost-transfer balances and allowance:");
      console.log("Owner:", ethers.formatEther(postOwnerBalance), "TT");
      console.log("Receiver:", ethers.formatEther(postReceiverBalance), "TT");
      console.log("Remaining allowance:", ethers.formatEther(postAllowance), "TT");
      console.log("Transfer successful!");

      expect(postReceiverBalance).to.equal(amount);
    });

    it("should fail when recipient does not implement onTransferReceived", async function () {
      const amount = ethers.parseUnits("30", 18);
      console.log("\nTest: TransferFrom and call to non-implementing contract");
      console.log("Transfer amount:", ethers.formatEther(amount), "TT");

      const approveTx = await erc1363Token.approve(addr1.address, amount);
      await approveTx.wait();
      console.log("Approval completed");
      console.log("Addr1 allowance:", ethers.formatEther(await erc1363Token.allowance(owner.address, addr1.address)), "TT");

      // Log pre-attempt balances
      const preOwnerBalance = await erc1363Token.balanceOf(owner.address);
      const preReceiverBalance = await erc1363Token.balanceOf(dummyContract.target);
      console.log("\nPre-attempt balances:");
      console.log("Owner:", ethers.formatEther(preOwnerBalance), "TT");
      console.log("DummyContract:", ethers.formatEther(preReceiverBalance), "TT");

      const erc1363TokenFromAddr1 = erc1363Token.connect(addr1);
      await expect(
        erc1363TokenFromAddr1.getFunction("transferFromAndCall(address,address,uint256,bytes)").send(owner.address, dummyContract.target, amount, "0x")
      ).to.be.revertedWith("ERC1363: transfer to non ERC1363Receiver implementer");

      // Log post-attempt balances
      const postOwnerBalance = await erc1363Token.balanceOf(owner.address);
      const postReceiverBalance = await erc1363Token.balanceOf(dummyContract.target);
      const postAllowance = await erc1363Token.allowance(owner.address, addr1.address);
      console.log("\nPost-attempt balances and allowance (should be unchanged except for allowance):");
      console.log("Owner:", ethers.formatEther(postOwnerBalance), "TT");
      console.log("DummyContract:", ethers.formatEther(postReceiverBalance), "TT");
      console.log("Remaining allowance:", ethers.formatEther(postAllowance), "TT");
      console.log("Transfer failed as expected!");
    });
  });

  describe("approveAndCall", function () {
    it("should approve tokens and call onApprovalReceived", async function () {
      const amount = ethers.parseUnits("100", 18);
      console.log("\nTest: Approve and call");
      console.log("Approval amount:", ethers.formatEther(amount), "TT");

      // Log pre-approval allowance
      const preAllowance = await erc1363Token.allowance(owner.address, spenderMock.target);
      console.log("\nPre-approval allowance:", ethers.formatEther(preAllowance), "TT");

      const tx = await erc1363Token.getFunction("approveAndCall(address,uint256,bytes)").send(spenderMock.target, amount, "0x");
      await tx.wait();

      // Log post-approval allowance
      const postAllowance = await erc1363Token.allowance(owner.address, spenderMock.target);
      console.log("Post-approval allowance:", ethers.formatEther(postAllowance), "TT");
      console.log("Approval successful!");
    });

    it("Should Toggel isTrue on transferAndCall",async function (){
      const amount = ethers.parseUnits("100", 18);
      //await erc1363Token.allowance(owner.address, spenderMock.target);
      const initialState = await spenderMock.isTrue();
      console.log(initialState);
      await erc1363Token.approveAndCall(spenderMock.target,amount);
      const ToggeledState = await spenderMock.isTrue();
      console.log("After toggeling");
      console.log(ToggeledState);
      expect(ToggeledState).to.be.true;
    })

    it("should fail when spender does not implement onApprovalReceived", async function () {
      const amount = ethers.parseUnits("100", 18);
      console.log("\nTest: Approve and call to non-implementing contract");
      console.log("Approval amount:", ethers.formatEther(amount), "TT");

      // Log pre-attempt allowance
      const preAllowance = await erc1363Token.allowance(owner.address, dummyContract.target);
      console.log("\nPre-attempt allowance:", ethers.formatEther(preAllowance), "TT");

      await expect(
        erc1363Token.getFunction("approveAndCall(address,uint256,bytes)").send(dummyContract.target, amount, "0x")
      ).to.be.revertedWith("ERC1363: approve to non ERC1363Spender implementer");

      // Log post-attempt allowance
      const postAllowance = await erc1363Token.allowance(owner.address, dummyContract.target);
      console.log("Post-attempt allowance (should be unchanged):", ethers.formatEther(postAllowance), "TT");
      console.log("Approval failed as expected!");
    });
  });
});