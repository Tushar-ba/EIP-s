require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
          evmVersion: "london"
        },
      },
    ],
  },
  networks: {
    hardhat: {},
    amoy: {
      url: "https://rpc-amoy.polygon.technology/",
      chainId: 80002,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: process.env.API_KEY
  }
};
sourcify: {
  enabled: true
}

/**
 * 
ERC20 address 0x73c39Df8Bbe39F50EFD5108EB325F14AE6F1c1f0
Receiver contract address 0x455A74C9063987DBc4B262639D8794B3bC8677D2
Spender contract address 0xfe7BF680D11F5e88Be75c69a8baf773e0FF8C643
ERC1363 deployed to 0x3EE25F2C9df150Eced890868ddd1e86942157730
Deployment successful
 */