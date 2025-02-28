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
 * Compiled 11 Solidity files successfully (evm target: london).
ERC20 Address 0x4f839ad9d90440F0605112652d06E5fF776a8d52
FlashBorrower Address 0x4f839ad9d90440F0605112652d06E5fF776a8d52
FlashLender Address 0x4f839ad9d90440F0605112652d06E5fF776a8d52
Deployed
 */