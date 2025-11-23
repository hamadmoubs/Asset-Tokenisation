const ERC20Token = artifacts.require("ERC20Token");

module.exports = async function (deployer) {
  const name = "MyToken";
  const symbol = "MTK";
  const decimals = 18;
  await deployer.deploy(ERC20Token, name, symbol, decimals);
  const token = await ERC20Token.deployed();
  console.log("✅ ERC20Token deployed at:", token.address);
};
