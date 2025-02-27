async function main(){
    let owners
    let ERC20, FlashBorrower, FlashLender

    [owners] = await ethers.getSigners();
    const ERC20Factory = await ethers.getContractFactory('TestToken',owners);
    ERC20 = await ERC20Factory.deploy();
    await ERC20.waitForDeployment();

    const FlashBorrowerFactory = await ethers.getContractFactory('FlashBorrower',owners);
    FlashBorrower = await FlashBorrowerFactory.deploy();
    await FlashBorrower.waitForDeployment();

    const FlashLenderFactory = await ethers.getContractFactory('FlashLender',owners);
    FlashLender = await FlashLenderFactory.deploy(1000);
    await FlashLender.waitForDeployment();
}

main().then(()=>{
    console.log("Deployed")
}).catch((err)=>{
    console.log(err);
})