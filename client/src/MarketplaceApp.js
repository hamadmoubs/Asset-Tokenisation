// client/src/MarketplaceApp.js
import React, { useEffect, useState } from "react";
import Web3 from "web3";

// import your ABI files
import ERC20ABI from "./ERC20ABI.json";
import KYCWhitelistABI from "./KYCWhitelistABI.json";
import MarketplaceABI from "./MarketplaceABI.json";

// ---------------------------
// Replace these with YOUR deployed addresses
// ---------------------------
const TOKEN_ADDRESS = "0xAa862ddAC09F6736A61E1124040Fd883A6533C19";
const KYC_ADDRESS = "0xD95B1DbEc167C6cf547d018dDEcF41a4cb2e2f73";
const MARKETPLACE_ADDRESS = "0x2445BC665aEfca58D2137BAf26A62Edb38cBC274";

// ---------------------------
// Helpers
// ---------------------------
function normalizeAbi(artifactOrAbi) {
  if (!artifactOrAbi) return null;
  if (Array.isArray(artifactOrAbi)) return artifactOrAbi;
  if (artifactOrAbi.abi && Array.isArray(artifactOrAbi.abi)) return artifactOrAbi.abi;
  if (artifactOrAbi.contracts && typeof artifactOrAbi.contracts === "object") {
    const first = Object.values(artifactOrAbi.contracts)[0];
    if (first && first.abi) return first.abi;
  }
  return null;
}

function isAddressValid(addr) {
  if (!addr) return false;
  if (addr === "0x0000000000000000000000000000000000000000") return false;
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

// ---------------------------
// Component
// ---------------------------
function MarketplaceApp() {
  const [account, setAccount] = useState("");
  const [web3, setWeb3] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [kycContract, setKycContract] = useState(null);
  const [marketContract, setMarketContract] = useState(null);

  const [ethBalance, setEthBalance] = useState("0");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const ERC20_ABI_NORMAL = normalizeAbi(ERC20ABI);
  const KYC_ABI_NORMAL = normalizeAbi(KYCWhitelistABI);
  const MARKETPLACE_ABI_NORMAL = normalizeAbi(MarketplaceABI);

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) {
        alert("Please install MetaMask or run Ganache and connect MetaMask to it.");
        return;
      }

      try {
        const w3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await w3.eth.getAccounts();
        const acct = accounts[0];
        setAccount(acct);
        setWeb3(w3);

        const balanceWei = await w3.eth.getBalance(acct);
        setEthBalance(w3.utils.fromWei(balanceWei, "ether"));

        if (isAddressValid(TOKEN_ADDRESS) && ERC20_ABI_NORMAL) {
          const token = new w3.eth.Contract(ERC20_ABI_NORMAL, TOKEN_ADDRESS);
          setTokenContract(token);
          try {
            const rawBal = await token.methods.balanceOf(acct).call();
            setTokenBalance(w3.utils.fromWei(rawBal.toString(), "ether"));
          } catch {}
        }

        if (isAddressValid(KYC_ADDRESS) && KYC_ABI_NORMAL) {
          const kyc = new w3.eth.Contract(KYC_ABI_NORMAL, KYC_ADDRESS);
          
          // ✅ ADD DEBUG LINE HERE
          console.log("KYC methods:", Object.keys(kyc.methods));

          setKycContract(kyc);
          try {
            const wh = await kyc.methods.isWhitelisted(acct).call();
            setIsWhitelisted(!!wh);
          } catch {}
        }

        if (isAddressValid(MARKETPLACE_ADDRESS) && MARKETPLACE_ABI_NORMAL) {
          const market = new w3.eth.Contract(MARKETPLACE_ABI_NORMAL, MARKETPLACE_ADDRESS);
          setMarketContract(market);
        }

        window.ethereum.on("accountsChanged", async (accounts) => {
          const a = accounts[0];
          setAccount(a);
          const newBal = await w3.eth.getBalance(a);
          setEthBalance(w3.utils.fromWei(newBal, "ether"));
          if (tokenContract) {
            try {
              const b = await tokenContract.methods.balanceOf(a).call();
              setTokenBalance(w3.utils.fromWei(b.toString(), "ether"));
            } catch {}
          }
          if (kycContract) {
            try {
              const wh = await kycContract.methods.isWhitelisted(a).call();
              setIsWhitelisted(!!wh);
            } catch {}
          } else {
            setIsWhitelisted(false);
          }
        });
      } catch (err) {
        console.error("Initialization error:", err);
        alert("Initialization error: " + (err.message || err));
      }
    };

    init();
  }, []);

  // ---------------------------
  // Request to be whitelisted
  // ---------------------------
  const requestWhitelist = async () => {
    if (!kycContract) return alert("KYC contract not available.");
    try {
      setLoading(true);
      setStatusMessage("⏳ Sending request...");
      await kycContract.methods.requestKYC().send({ from: account });
      setStatusMessage("✅ Request sent! Please wait for admin approval.");
    } catch (err) {
      console.error(err);
      setStatusMessage("❌ Failed to send request: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Token listing (same as before)
  // ---------------------------
  const listTokens = async () => {
    if (!tokenContract) return alert("Token contract not loaded.");
    if (!marketContract) {
      return alert("Marketplace not deployed.");
    }
    try {
      setLoading(true);
      const amtWei = web3.utils.toWei(amount || "0", "ether");
      const priceWei = web3.utils.toWei(price || "0", "ether");

      await tokenContract.methods.approve(MARKETPLACE_ADDRESS, amtWei).send({ from: account });
      await marketContract.methods.listTokens(amtWei, priceWei).send({ from: account });

      alert("✅ Listed tokens on marketplace.");
    } catch (err) {
      alert("❌ Listing failed: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>🌍 Token Marketplace</h1>
      <p><strong>Connected Account:</strong> {account || "Not connected"}</p>
      <p><strong>ETH Balance:</strong> {ethBalance} ETH</p>
      <p><strong>Token Balance:</strong> {tokenBalance}</p>
      <p><strong>Whitelist Status:</strong> {isWhitelisted ? "✅ Verified" : "❌ Not Verified"}</p>

      {!isWhitelisted && (
        <>
          <button onClick={requestWhitelist} disabled={loading}>
            📨 Request Whitelist Approval
          </button>
          <p>{statusMessage}</p>
        </>
      )}

      {isWhitelisted && (
        <>
          <h3 style={{ marginTop: 24 }}>📤 List Tokens</h3>
          <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ marginRight: 8 }} />
          <input placeholder="Price (ETH per token)" value={price} onChange={(e) => setPrice(e.target.value)} style={{ marginRight: 8 }} />
          <button onClick={listTokens} disabled={loading}>List</button>
        </>
      )}
    </div>
  );
}

export default MarketplaceApp;
