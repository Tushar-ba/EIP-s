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

/**
 * 
 * 
Compiled 16 Solidity files successfully (evm target: london).
TestToken Address 0x4EC3a346B642375a87a91C23B86f5Fac99a73e9c
Share Address 0xd1381aD6c0D69170F68e1449F319d909013C2BB2
TokenAVault Address 0xeF12ed20D38f85c5103E433ac020e9005FcB30f0
BidirectionalPipe Address 0xb6Bfe55517FFe66AEd6717FF8960D800d64BaE64
Deployed
PS D:\SoluLabs\EIP- latest git pull\main\EIP-7575>
 */