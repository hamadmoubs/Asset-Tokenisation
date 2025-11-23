// scripts/mint_tokens.js
// Run: npx truffle exec scripts/mint_tokens.js --network development

const ERC20Token = artifacts.require("ERC20Token");

module.exports = async function (callback) {
  try {
    const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0]; // minter / owner
    const vendor = accounts[1];   // same as your Vendor Metamask
    const customer = accounts[2]; // example customer

    const token = await ERC20Token.deployed();

    const amount = web3.utils.toWei("1000", "ether");

    console.log("------------------------------------------------------");
    console.log("Current balances (before mint)...");
    console.log("------------------------------------------------------");
    const balDeployer = await token.balanceOf(deployer);
    const balVendor = await token.balanceOf(vendor);
    const balCustomer = await token.balanceOf(customer);
    console.log("Deployer:", web3.utils.fromWei(String(balDeployer), "ether"));
    console.log("Vendor  :", web3.utils.fromWei(String(balVendor), "ether"));
    console.log("Customer:", web3.utils.fromWei(String(balCustomer), "ether"));

    console.log("\nMinting 1000 tokens to Vendor and Customer...\n");

    if (typeof token.mint === "function") {
      await token.mint(vendor, amount, { from: deployer });
      await token.mint(customer, amount, { from: deployer });
    } else {
      throw new Error(
        "token.mint(...) is not available on ERC20Token. Check your token implementation."
      );
    }

    const balVendor2 = await token.balanceOf(vendor);
    const balCustomer2 = await token.balanceOf(customer);
    console.log("New Vendor balance  :", web3.utils.fromWei(String(balVendor2), "ether"));
    console.log("New Customer balance:", web3.utils.fromWei(String(balCustomer2), "ether"));

    console.log("\n✅ Mint done.");
    callback();
  } catch (err) {
    console.error("\n❌ Mint failed:", err);
    callback(err);
  }
};
