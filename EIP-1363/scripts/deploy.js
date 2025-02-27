async function main (){
    let owner ;
    let ERC20, ERC1363ReceiverMock, ERC1363SpenderMock, ERC1363Token;

    [owner] = await ethers.getSigners();
    const ERC20Factory = await ethers.getContractFactory('ERC20',owner); 
    //string memory _name, string memory _symbol, uint256 _totalSupply
    ERC20 = await ERC20Factory.deploy("Tushar",'TBA',ethers.parseEther("1"));
    await ERC20.waitForDeployment();
    console.log(`ERC20 address ${ERC20.target}`);

    const ERC1363ReceiverMockFactory = await ethers.getContractFactory('ERC1363ReceiverMock',owner);
    ERC1363ReceiverMock = await ERC1363ReceiverMockFactory.deploy();
    await ERC1363ReceiverMock.waitForDeployment();
    console.log(`Receiver contract address ${ERC1363ReceiverMock.target}`)

    const ERC1363SpenderMockFactory = await ethers.getContractFactory('ERC1363ReceiverMock',owner);
    ERC1363SpenderMock = await ERC1363SpenderMockFactory.deploy();
    await ERC1363SpenderMock.waitForDeployment();
    console.log(`Receiver contract address ${ERC1363SpenderMock.target}`);

    const ERC1363TokenFactory = await ethers.getContractFactory('ERC1363Token');
    ERC1363Token = await ERC1363TokenFactory.deploy("Tushar",'TBA',ethers.parseEther("1"));
    await ERC1363Token.waitForDeployment();
    console.log(`ERC1363 deployed to ${ERC1363Token.target}`)
}

main().then(()=>{
    console.log("Deployment successful")
}).catch((err)=>{
    console.log(err);
})