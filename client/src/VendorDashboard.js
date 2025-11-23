/* global BigInt */  // let ESLint know BigInt is a global

import React, { useEffect, useState } from "react";
import { getWeb3, isAddress, nonZero } from "./_web3";
import { ERC20_ABI, KYC_ABI, MARKETPLACE_ABI } from "./_abi";
import { TOKEN_ADDRESS, KYC_ADDRESS, MARKETPLACE_ADDRESS } from "./_addresses";

const big = (v) => BigInt(String(v || "0"));

// Map tuple/array structs to named fields
const normalizeListing = (li, idFallback = 0) => {
  if (!li) {
    return { id: idFallback, seller: "", amount: "0", pricePerToken: "0", sold: "0", active: false };
  }

  // Newer ABI: named struct
  if (li.seller !== undefined) {
    return {
      id: li.id ?? idFallback,
      seller: li.seller,
      amount: li.amount,
      pricePerToken: li.pricePerToken,
      sold: li.sold ?? "0",
      active: li.active,
    };
  }

  // Older ABI: tuple [seller, amount, pricePerToken, active] or [id, seller, amount, pricePerToken, sold, active]
  if (li.length === 4) {
    return {
      id: idFallback,
      seller: li[0],
      amount: li[1],
      pricePerToken: li[2],
      sold: "0",
      active: li[3],
    };
  }

  return {
    id: li[0] ?? idFallback,
    seller: li[1],
    amount: li[2],
    pricePerToken: li[3],
    sold: li[4] ?? "0",
    active: li[5],
  };
};

export default function VendorDashboard() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [token, setToken] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [market, setMarket] = useState(null);

  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [tokenBalance, setTokenBalance] = useState("0");

  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("");

  const [myListings, setMyListings] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const w3 = await getWeb3();
        const [acc] = await w3.eth.getAccounts();
        setWeb3(w3);
        setAccount(acc);

        if (!ERC20_ABI || !isAddress(TOKEN_ADDRESS)) throw new Error("ERC20 not configured");
        const t = new w3.eth.Contract(ERC20_ABI, TOKEN_ADDRESS);
        setToken(t);

        if (!KYC_ABI || !isAddress(KYC_ADDRESS)) throw new Error("KYC not configured");
        const k = new w3.eth.Contract(KYC_ABI, KYC_ADDRESS);
        setKyc(k);

        if (!MARKETPLACE_ABI || !isAddress(MARKETPLACE_ADDRESS)) throw new Error("Marketplace not configured");
        const m = new w3.eth.Contract(MARKETPLACE_ABI, MARKETPLACE_ADDRESS);
        setMarket(m);

        // balances & whitelist
        const bal = await t.methods.balanceOf(acc).call();
        setTokenBalance(w3.utils.fromWei(String(bal), "ether"));

        const wh = await k.methods.isWhitelisted(acc).call();
        setIsWhitelisted(!!wh);

        await loadMyListings(m, acc);

        if (window.ethereum) {
          window.ethereum.on("accountsChanged", async (accs) => {
            const a = accs[0];
            setAccount(a);
            const b = await t.methods.balanceOf(a).call();
            setTokenBalance(w3.utils.fromWei(String(b), "ether"));
            const w = await k.methods.isWhitelisted(a).call();
            setIsWhitelisted(!!w);
            await loadMyListings(m, a);
          });
        }
      } catch (e) {
        alert(e.message || e);
      }
    })();
  }, []);

  const requestWhitelist = async () => {
    try {
      setStatus("⏳ Sending whitelist request...");
      await kyc.methods.requestKYC().send({ from: account });
      setStatus("✅ Request sent. Wait for admin approval.");
    } catch (e) {
      setStatus("❌ Failed: " + (e.message || e));
    }
  };

  // amtWei = amount of tokens in smallest units (18 decimals)
  const preflightApproveIfNeeded = async (amtWei) => {
    const bal = await token.methods.balanceOf(account).call();
    if (big(bal) < big(amtWei)) {
      throw new Error(
        `Insufficient token balance. Need ${web3.utils.fromWei(String(amtWei))}, have ${web3.utils.fromWei(String(bal))}`
      );
    }

    let allowance = await token.methods.allowance(account, MARKETPLACE_ADDRESS).call();
    if (big(allowance) >= big(amtWei)) return; // already enough

    setStatus("⏳ Approving Marketplace to spend your tokens…");

    // Some tokens require reset to 0 first; safe pattern
    if (big(allowance) > 0n) {
      try {
        await token.methods.approve(MARKETPLACE_ADDRESS, "0").send({ from: account });
        allowance = await token.methods.allowance(account, MARKETPLACE_ADDRESS).call();
      } catch {
        // ignore if token doesn't require reset
      }
    }

    await token.methods.approve(MARKETPLACE_ADDRESS, String(amtWei)).send({ from: account });

    const newAllowance = await token.methods.allowance(account, MARKETPLACE_ADDRESS).call();
    if (big(newAllowance) < big(amtWei)) {
      throw new Error(`Approve did not stick. Got allowance ${web3.utils.fromWei(String(newAllowance))}`);
    }
  };

  const listTokens = async () => {
    if (!isWhitelisted) return alert("You must be whitelisted to list.");
    if (!market || !token || !web3) return alert("Contracts not ready");

    try {
      setStatus("🔎 Preflight...");

      const amountTokensStr = (amount || "0").trim(); // whole tokens typed by user
      const priceEthStr = (price || "0").trim();      // ETH per token

      const tokensBI = BigInt(amountTokensStr || "0");
      if (tokensBI <= 0n) return setStatus("❌ Amount must be > 0");

      const priceWei = web3.utils.toWei(priceEthStr, "ether"); // wei per token
      if (big(priceWei) <= 0n) return setStatus("❌ Price must be > 0");

      // amount in smallest units (18 decimals) for allowance / escrow
      const amtWei = (tokensBI * (10n ** 18n)).toString();

      await preflightApproveIfNeeded(amtWei);

      setStatus("⏳ Listing on-chain...");

      // ✅ IMPORTANT: pass WHOLE TOKENS here, not amtWei
      await market.methods
        .listTokens(amountTokensStr, priceWei)
        .send({ from: account });

      setStatus("✅ Listed successfully.");
      setAmount("");
      setPrice("");

      await loadMyListings(market, account);

      // refresh balance
      const bal = await token.methods.balanceOf(account).call();
      setTokenBalance(web3.utils.fromWei(String(bal), "ether"));
    } catch (e) {
      setStatus("❌ Listing failed: " + (e?.message || e));
    }
  };

  const loadMyListings = async (marketContract, who) => {
    if (!marketContract || !who) return;
    const all = await pullListings(marketContract);
    const mine = all.filter((l) => l.seller?.toLowerCase() === who.toLowerCase());
    setMyListings(mine);
  };

  const pullListings = async (m) => {
    const out = [];

    // New Marketplace: getListingCount()
    if (m.methods.getListingCount) {
      const count = Number(await m.methods.getListingCount().call());
      for (let i = 0; i < count; i++) {
        const li = await m.methods.listings(i).call();
        out.push(normalizeListing(li, i));
      }
      return out.filter((l) => !!l.active);
    }

    // Older Marketplace: nextListingId()
    if (m.methods.nextListingId) {
      const count = Number(await m.methods.nextListingId().call());
      for (let i = 0; i < count; i++) {
        const li = await m.methods.listings(i).call();
        out.push(normalizeListing(li, i));
      }
      return out.filter((l) => !!l.active);
    }

    // getActiveListings()
    if (m.methods.getActiveListings) {
      const arr = await m.methods.getActiveListings().call();
      return arr.map((li, i) => normalizeListing(li, i)).filter((l) => !!l.active);
    }

    // Brute-force scan
    const N = 50;
    for (let i = 0; i < N; i++) {
      try {
        const li = await m.methods.listings(i).call();
        const norm = normalizeListing(li, i);
        if (norm && nonZero(norm.seller)) out.push(norm);
      } catch {
        break;
      }
    }
    return out.filter((l) => !!l.active);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>🏪 Vendor Dashboard</h1>
      <p><b>Account:</b> {account}</p>
      <p><b>Token Balance:</b> {tokenBalance}</p>
      <p><b>Whitelist:</b> {isWhitelisted ? "✅ Verified" : "❌ Not Verified"}</p>

      {!isWhitelisted && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={requestWhitelist}>📨 Request Whitelist Approval</button>
        </div>
      )}

      {isWhitelisted && (
        <>
          <h3>📤 List Tokens</h3>
          <input
            placeholder="Amount (whole tokens)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <input
            placeholder="Price (ETH per token)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <button onClick={listTokens}>List</button>
        </>
      )}

      <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{status}</p>

      <h3 style={{ marginTop: 24 }}>📦 My Listings</h3>
      {myListings.length === 0 ? (
        <p>No listings yet.</p>
      ) : (
        myListings.map((l) => {
          const amountTokens = String(l.amount || "0");
          const soldTokens   = String(l.sold || "0");
          const remaining    = (Number(amountTokens) - Number(soldTokens)).toString();
          const priceEth     = web3.utils.fromWei(String(l.pricePerToken || "0"), "ether");

          return (
            <div key={l.id} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 8 }}>
              <p style={{ margin: 0 }}>Listing #{l.id}</p>
              <p style={{ margin: 0 }}>Price: {priceEth} ETH / token</p>
              <p style={{ margin: 0 }}>Total: {amountTokens} | Sold: {soldTokens} | Remaining: {remaining}</p>
              <p style={{ margin: 0 }}>Active: {l.active ? "Yes" : "No"}</p>
            </div>
          );
        })
      )}
      <button style={{ marginTop: 8 }} onClick={() => loadMyListings(market, account)}>🔁 Refresh</button>
    </div>
  );
}
