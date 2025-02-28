async function main() {
    let owner
    let BidirectionalPipe, Share, TestToken, TokenAVault

    let TestTokenFactory = await ethers.getContractFactory('TestToken')
    TestToken = await TestTokenFactory.deploy(ethers.parseUnits('1',18));
    await TestToken.waitForDeployment();
    console.log(`TestToken Address ${TestToken.target}`)

    let ShareFactory = await ethers.getContractFactory('Share')
    Share = await ShareFactory.deploy("ShareToken","ST");
    await Share.waitForDeployment();
    console.log(`Share Address ${Share.target}`)

    let TokenAVaultFactory = await ethers.getContractFactory('TokenAVault')
    TokenAVault = await TokenAVaultFactory.deploy(TestToken.target, Share.target);
    await TokenAVault.waitForDeployment();
    console.log(`TokenAVault Address ${TokenAVault.target}`)

    
    let BidirectionalPipeFactory = await ethers.getContractFactory('BidirectionalPipe')
    BidirectionalPipe = await BidirectionalPipeFactory.deploy(TokenAVault.target, TestToken.target);
    await BidirectionalPipe.waitForDeployment();
    console.log(`BidirectionalPipe Address ${BidirectionalPipe.target}`)
}

main().then(()=>{
    console.log("Deployed")
}).catch((err)=>{
    console.log(err)
    process.exit(1);
})