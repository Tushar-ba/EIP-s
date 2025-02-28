require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
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


// EIP contract deployed to:-  0x14b2316249b7092b4C039e0151F55AAFC3f91ea5
// EIPReceiver contract deployedto:- 0xeF60205B1Ea614134240c312E2d294007f858ba5
// EIPNonReceiver contract deployed to:- 0x7a3F5632Ee1bce81eAa530A3ae288a0b5937e88c
// Deployment successful