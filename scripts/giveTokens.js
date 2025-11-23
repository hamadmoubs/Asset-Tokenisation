// mintTokens.js
//
// Run with:
//   node mintTokens.js

const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");

// 🔐 addresses
const DEPLOYER = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";  // Ganache account 0
const VENDOR   = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";  // your MetaMask account

// 🔥 TOKEN CONTRACT ADDRESS (from _addresses.js)
const TOKEN_ADDRESS = "0x8f0483125FCb9aaAEFA9209D8E9d7b9C8B9Fb90F";

// ABI must include mint()
const TOKEN_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "account", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "name": "mint",
    "outputs": [],
    "type": "function"
  }
];

async function main() {
  const token = new web3.eth.Contract(TOKEN_ABI, TOKEN_ADDRESS);

  console.log("\n--- BEFORE MINTING ---");
  let bVendor = await token.methods.balanceOf(VENDOR).call();
  console.log("Vendor tokens:", web3.utils.fromWei(bVendor, "ether"));

  const amount = web3.utils.toWei("1000", "ether");

  console.log("\nMinting 1000 tokens to vendor...");

  await token.methods.mint(VENDOR, amount).send({ from: DEPLOYER });

  console.log("\n--- AFTER MINTING ---");
  bVendor = await token.methods.balanceOf(VENDOR).call();
  console.log("Vendor tokens:", web3.utils.fromWei(bVendor, "ether"));
}

main().catch(console.error);
