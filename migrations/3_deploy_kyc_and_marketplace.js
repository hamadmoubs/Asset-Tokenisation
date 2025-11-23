const KYCWhitelist = artifacts.require("KYCWhitelist");
const Marketplace = artifacts.require("Marketplace");
const ERC20Token = artifacts.require("ERC20Token");   // ✅ ADDED

module.exports = async function (deployer, network, accounts) {
  const ADMIN = accounts[1];

  // 1) Deploy KYC
  await deployer.deploy(KYCWhitelist, { from: ADMIN });
  const kyc = await KYCWhitelist.deployed();
  console.log("KYCWhitelist deployed at:", kyc.address, " owner:", ADMIN);

  // 2) Get REAL ERC20 token deployed in 3_deploy_erc20.js
  const token = await ERC20Token.deployed();   // ✅ USE REAL TOKEN
  console.log("Using ERC20Token at:", token.address);

  // 3) Deploy Marketplace using correct token
  await deployer.deploy(Marketplace, token.address, { from: ADMIN });
  const market = await Marketplace.deployed();
  console.log("Marketplace deployed at:", market.address);
};
