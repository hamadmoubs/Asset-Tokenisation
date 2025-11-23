require('dotenv').config();
// ❌ REMOVE these — they break the Truffle console
// require('babel-register');
// require('babel-polyfill');

const HDWalletProvider = require('@truffle/hdwallet-provider');

const providerWithMnemonic = (mnemonic, rpcEndpoint) => () =>
  new HDWalletProvider(mnemonic, rpcEndpoint);

const infuraProvider = (network) =>
  providerWithMnemonic(
    process.env.MNEMONIC || '',
    `https://${network}.infura.io/v3/${process.env.INFURA_API_KEY}`
  );

const ropstenProvider = process.env.SOLIDITY_COVERAGE
  ? undefined
  : infuraProvider('ropsten');

module.exports = {
  // 🔥 Required so Truffle console loads properly!
  contracts_build_directory: "./build/contracts",
  contracts_directory: "./contracts",
  migrations_directory: "./migrations",
  test_directory: "./test",

  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*',
      gas: 6721975,
      gasPrice: 20000000000, // 20 gwei
    },

    test: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*',
      gas: 6721975,
      gasPrice: 20000000000,
    },

    ropsten: {
      provider: ropstenProvider,
      network_id: 3,
      gasPrice: 5000000000,
    },

    coverage: {
      host: '127.0.0.1',
      network_id: '*',
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
      disableConfirmationListener: true,
    },

    ganache: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*',
    },

    dotEnvNetwork: {
      provider: providerWithMnemonic(
        process.env.MNEMONIC,
        process.env.RPC_ENDPOINT
      ),
      network_id: parseInt(process.env.NETWORK_ID) || '*',
    },
  },

  // ❗ COMMENT OUT ALL PLUGINS FOR NOW (they break the console)
  // plugins: [
  //   "solidity-coverage",
  //   "truffle-contract-size",
  //   "truffle-plugin-verify"
  // ],

  compilers: {
    solc: {
      version: '0.8.7',
      settings: {
        optimizer: {
          enabled: true,
          runs: 0,
        },
      },
    },
  },

  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
  },
};
