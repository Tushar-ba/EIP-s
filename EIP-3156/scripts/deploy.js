async function main(){
    let owners
    let ERC20, FlashBorrower, FlashLender

    [owners] = await ethers.getSigners();
    const ERC20Factory = await ethers.getContractFactory('TestToken',owners);
    ERC20 = await ERC20Factory.deploy();
    await ERC20.waitForDeployment();
    console.log(`ERC20 Address ${ERC20.target}`)

    const FlashBorrowerFactory = await ethers.getContractFactory('FlashBorrower',owners);
    FlashBorrower = await FlashBorrowerFactory.deploy();
    await FlashBorrower.waitForDeployment();
    console.log(`FlashBorrower Address ${ERC20.target}`)

    const FlashLenderFactory = await ethers.getContractFactory('FlashLender',owners);
    FlashLender = await FlashLenderFactory.deploy(1000);
    await FlashLender.waitForDeployment();
    console.log(`FlashLender Address ${ERC20.target}`)
}

main().then(()=>{
    console.log("Deployed")
}).catch((err)=>{
    console.log(err);
    process.exit(1);
})