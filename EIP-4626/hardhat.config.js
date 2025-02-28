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
 * Compiled 19 Solidity files successfully (evm target: london).
RewardToken address 0x485Bb73229387C380B5A39548B99ec669F4c96AA
TestToken address 0x18919a3AA1D9004b9dd13E6d6D2cE348cA4883b3
MyYieldVault address 0xA70F8E3c4401eF0e057677a2Dd0C3b61C6D2b122
Deployed successfully
PS D:\SoluLabs\EIP- latest git pull\main\EIP-4626>
 */