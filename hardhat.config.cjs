require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");

let deployerKey = process.env.PRIVATE_KEY;
if (!deployerKey && fs.existsSync(".deployer_wallet.json")) {
  try {
    const data = JSON.parse(fs.readFileSync(".deployer_wallet.json", "utf8"));
    if (data.privateKey) deployerKey = data.privateKey;
  } catch (e) {}
}

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    robinhood: {
      url: process.env.RPC_URL || "https://rpc.mainnet.chain.robinhood.com",
      chainId: process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 4663,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
