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

// Compiled 5 Solidity files successfully (evm target: london).
// MockRegistry deployed to 0x3DaB106A66D37A5238D4466D1728EB4Ca62b2ef6
// EIP777Token deployed to 0xD1F9aE69Ae91A5dB117e22535A9a2eE26Bb90BC4
// Deployment successfull
// PS D:\SoluLabs\EIP- latest git pull\main\EIP-777>