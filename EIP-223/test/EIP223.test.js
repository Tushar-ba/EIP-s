const {expect} = require ("chai");
const {ethers} = require ("hardhat");

describe("EIP223",async function(){
  let owner;
  let EIP223Enabled , EIP223Disabled, EIP223Contract;

  beforeEach(async function(){
    [owner] = await ethers.getSigners();
    const EIPContractFactory = await ethers.getContractFactory("EIP223Token",owner);
    EIP223Contract = await EIPContractFactory.deploy(1);
    await EIP223Contract.waitForDeployment();
    console.log("EIP contract deployed");

    const EIP223EnabledFactory = await ethers.getContractFactory("ReceiverContract",owner);
    EIP223Enabled = await EIP223EnabledFactory.deploy();
    await EIP223Enabled.waitForDeployment();
    console.log("EIPReceiver contract deployed");

    const EIP223DisabledFactory = await ethers.getContractFactory("NonReceiverContract",owner);
    EIP223Disabled = await EIP223DisabledFactory.deploy();
    await EIP223Disabled.waitForDeployment();
    console.log("EIPReceiver contract deployed");
  })
  it("Should send token to the Enabled contract", async function(){
    expect(await EIP223Contract.connect(owner).transfer2(EIP223Enabled.target,ethers.parseEther("0.5"))).to.emit(EIP223Contract,"Transfer").withArgs(owner.address, EIP223Enabled.target,ethers.parseEther("0.5"), "0x00");
    //console.log(await EIP223Contract.balanceOf(owner.address));
    //console.log(await EIP223Enabled.getReceivedAmount());
  })
  it("Should fail when transferring to non-EIP223 contract", async function() {
    const transferAmount = ethers.parseEther("0.5");
    await expect(EIP223Contract.connect(owner).transfer2(EIP223Disabled.target, transferAmount)).to.be.revertedWithoutReason();
    expect(await EIP223Contract.balanceOf(EIP223Disabled.target)).to.equal(0);
    //console.log(await EIP223Contract.balanceOf(owner.address));
    //console.log(await EIP223Enabled.getReceivedAmount());
  });
  it("Should Successfully transfer the tokens to EOA's", async function(){
    const transferAmount = ethers.parseEther("0.5");
    expect(await EIP223Contract.connect(owner).transfer2(owner.address, transferAmount)).to.emit(EIP223Contract,"Transfer").withArgs(owner.address, EIP223Enabled.target,ethers.parseEther("0.5"), "0x00");
    expect(await EIP223Contract.balanceOf(owner.address)).to.equal(ethers.parseEther("1"));
    //console.log(await EIP223Contract.balanceOf(owner.address));
   // console.log(await EIP223Enabled.getReceivedAmount());
  })
})