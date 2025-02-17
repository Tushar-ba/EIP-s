async function main(){
    let owner;
    let EIP223Enabled , EIP223Disabled, EIP223Contract;
    [owner] = await ethers.getSigners();

    const EIPContractFactory = await ethers.getContractFactory("EIP223Token",owner);
    EIP223Contract = await EIPContractFactory.deploy(1);
    await EIP223Contract.waitForDeployment();
    console.log("EIP contract deployed to:- ",EIP223Contract.target);

    const EIP223EnabledFactory = await ethers.getContractFactory("ReceiverContract",owner);
    EIP223Enabled = await EIP223EnabledFactory.deploy();
    await EIP223Enabled.waitForDeployment();
    console.log("EIPReceiver contract deployedto:-",EIP223Enabled.target);

    const EIP223DisabledFactory = await ethers.getContractFactory("NonReceiverContract",owner);
    EIP223Disabled = await EIP223DisabledFactory.deploy();
    await EIP223Disabled.waitForDeployment();
    console.log("EIPNonReceiver contract deployed to:-",EIP223Disabled.target);

}