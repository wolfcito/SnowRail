require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./src",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    // Avalanche C-Chain Mainnet - for future deployment
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      // accounts: [process.env.PRIVATE_KEY] // Uncomment when deploying
    },
    // Avalanche Fuji Testnet - for testing
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      // accounts: [process.env.PRIVATE_KEY] // Uncomment when deploying
    }
  }
};

