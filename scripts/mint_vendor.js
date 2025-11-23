// scripts/mint_vendor.js
module.exports = async function (callback) {
  try {
    const ERC20Token = artifacts.require("ERC20Token");
    const Marketplace = artifacts.require("Marketplace");

    const accounts = await web3.eth.getAccounts();
    const vendor = accounts[1];

    const market = await Marketplace.deployed();
    const tokenAddr = await market.token();

    const token = await ERC20Token.at(tokenAddr);

    console.log("Token used by marketplace:", tokenAddr);
    console.log("Minting 1000 tokens to vendor:", vendor);

    await token.mint(vendor, web3.utils.toWei("1000", "ether"));

    const bal = await token.balanceOf(vendor);
    console.log("Vendor balance:", bal.toString());
  } catch (e) {
    console.error(e);
  }
  callback();
};
