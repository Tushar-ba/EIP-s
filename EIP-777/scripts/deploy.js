async function main(){
    let owner 
    let MockRegistry , EIP777Token
    [owner] = await ethers.getSigners();
    
    const MockRegistryFactory = await ethers.getContractFactory('MockERC1820Registry',owner);
    MockRegistry = await MockRegistryFactory.deploy();
    await MockRegistry.waitForDeployment();
    console.log(`MockRegistry deployed to ${MockRegistry.target}`)

    const EIP777TokneFactory = await ethers.getContractFactory('EIP777Token',owner);
    EIP777Token = await EIP777TokneFactory.deploy('Tushar','TBA',[owner.address],MockRegistry.target);
    await EIP777Token.waitForDeployment();
    console.log(`EIP777Token deployed to ${EIP777Token.target}`);
}

main().then(()=>{
    console.log("Deployment successfull");
}).catch((err)=>{
    console.log("Cannot deploy the contract",err);
    process.exit(1);
})