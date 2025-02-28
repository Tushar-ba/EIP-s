async function main (){
    let owner
    let RewardToken, TestToken, MyYieldVault
    [owner] = await ethers.getSigners()
    let RewardTokenFactory = await ethers.getContractFactory('RewardToken',owner);
    RewardToken = await RewardTokenFactory.deploy();
    await RewardToken.waitForDeployment();
    console.log(`RewardToken address ${RewardToken.target}`);

    let TestTokenFactory = await ethers.getContractFactory('TestToken',owner);
    TestToken = await TestTokenFactory.deploy(ethers.parseEther('1'));
    await TestToken.waitForDeployment();
    console.log(`TestToken address ${TestToken.target}`);

    let MyYieldVaultFactory = await ethers.getContractFactory('MyYieldVault',owner);
    MyYieldVault = await MyYieldVaultFactory.deploy(TestToken.target,RewardToken.target,ethers.parseEther('1'));
    await MyYieldVault.waitForDeployment();
    console.log(`MyYieldVault address ${MyYieldVault.target}`);
}

main().then(()=>{
    console.log("Deployed successfully");
}).catch((err)=>{
    console.log(err);
    process.exit(1);
})