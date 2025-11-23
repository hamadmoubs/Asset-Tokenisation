module.exports = async function (callback) {
  try {
    const ERC1400HoldableCertificateToken = artifacts.require("ERC1400HoldableCertificateToken");
    const token = await ERC1400HoldableCertificateToken.deployed();

    // 🔑 Replace with the new owner (your MetaMask account)
    const newOwner = "0x11FA93ACeBE0414A0cE65aeF1215388C90454dB2";

    // 👑 Current owner (the controller address found earlier)
    const currentOwner = "0xb5747835141b46f7C472393B31F8F5A57F74A44f";

    console.log("Transferring ownership from:", currentOwner);
    console.log("To new owner:", newOwner);

    const tx = await token.transferOwnership(newOwner, { from: currentOwner });

    console.log("✅ Ownership transferred successfully!");
    console.log("Transaction hash:", tx.tx);
  } catch (error) {
    console.error("❌ Error transferring ownership:", error);
  }
  callback();
};
