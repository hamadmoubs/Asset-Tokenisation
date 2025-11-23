// scripts/syncMarketplaceABI.js
//
// Copies the current Marketplace ABI from Truffle build into
// client/src/MarketplaceABI.json so the frontend and contract stay in sync.

const fs = require("fs");
const path = require("path");

module.exports = async function (callback) {
  try {
    const buildPath = path.join(__dirname, "..", "build", "contracts", "Marketplace.json");
    const clientAbiPath = path.join(__dirname, "..", "client", "src", "MarketplaceABI.json");

    if (!fs.existsSync(buildPath)) {
      throw new Error("Marketplace.json not found in build/contracts. Did you run `npx truffle compile`?");
    }

    const artifactRaw = fs.readFileSync(buildPath, "utf8");
    const artifact = JSON.parse(artifactRaw);

    if (!artifact.abi) {
      throw new Error("No ABI field in Marketplace.json");
    }

    const abiJson = JSON.stringify(artifact.abi, null, 2);

    // Ensure folder exists
    const clientDir = path.dirname(clientAbiPath);
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }

    fs.writeFileSync(clientAbiPath, abiJson, "utf8");

    console.log("✅ Synced Marketplace ABI to:", clientAbiPath);
    callback();
  } catch (err) {
    console.error("❌ ABI sync failed:", err);
    callback(err);
  }
};
