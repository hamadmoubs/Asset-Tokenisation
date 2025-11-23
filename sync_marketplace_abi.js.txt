// sync_marketplace_abi.js
// Copies the Truffle Marketplace ABI into client/src/MarketplaceABI.json

const fs = require("fs");
const path = require("path");

const TRUFFLE_ARTIFACT = path.join(__dirname, "build", "contracts", "Marketplace.json");
const CLIENT_ABI = path.join(__dirname, "client", "src", "MarketplaceABI.json");

function main() {
  if (!fs.existsSync(TRUFFLE_ARTIFACT)) {
    console.error("❌ Cannot find build/contracts/Marketplace.json – run `npx truffle compile` first.");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(TRUFFLE_ARTIFACT, "utf8"));
  const abi = artifact.abi;

  fs.writeFileSync(CLIENT_ABI, JSON.stringify(abi, null, 2));
  console.log("✅ Synced Marketplace ABI →", CLIENT_ABI);
}

main();
