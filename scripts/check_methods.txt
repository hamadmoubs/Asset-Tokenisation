module.exports = async function (callback) {
  try {
    const Token = artifacts.require("ERC1400HoldableCertificateToken");
    const token = await Token.deployed();

    console.log("✅ Contract loaded at:", token.address);
    console.log("Available methods:");
    console.log(Object.keys(token));
  } catch (error) {
    console.error("❌ Error:", error);
  }
  callback();
};
