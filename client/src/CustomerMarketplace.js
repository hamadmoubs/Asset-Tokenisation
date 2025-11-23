/* global BigInt */

import React, { useEffect, useState } from "react";
import { getWeb3, isAddress, nonZero } from "./_web3";
import { KYC_ABI, MARKETPLACE_ABI } from "./_abi";
import { KYC_ADDRESS, MARKETPLACE_ADDRESS } from "./_addresses";

const big = (v) => BigInt(String(v || "0"));

// Map tuple/array structs to named fields
const normalizeListing = (li, idFallback = 0) => {
  if (!li) {
    return { id: idFallback, seller: "", amount: "0", pricePerToken: "0", sold: "0", active: false };
  }

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

export default function CustomerMarketplace() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [kyc, setKyc] = useState(null);
  const [market, setMarket] = useState(null);

  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [listings, setListings] = useState([]);
  const [status, setStatus] = useState("");

  const [buyAmountById, setBuyAmountById] = useState({}); // { [id]: "amount" }

  useEffect(() => {
    (async () => {
      try {
        const w3 = await getWeb3();
        const [acc] = await w3.eth.getAccounts();
        setWeb3(w3);
        setAccount(acc);

        if (!KYC_ABI || !isAddress(KYC_ADDRESS)) throw new Error("KYC not configured");
        const k = new w3.eth.Contract(KYC_ABI, KYC_ADDRESS);
        setKyc(k);

        if (!MARKETPLACE_ABI || !isAddress(MARKETPLACE_ADDRESS)) throw new Error("Marketplace not configured");
        const m = new w3.eth.Contract(MARKETPLACE_ABI, MARKETPLACE_ADDRESS);
        setMarket(m);

        const wh = await k.methods.isWhitelisted(acc).call();
        setIsWhitelisted(!!wh);

        await loadListings(m);

        if (window.ethereum) {
          window.ethereum.on("accountsChanged", async (accs) => {
            const a = accs[0];
            setAccount(a);
            const w = await k.methods.isWhitelisted(a).call();
            setIsWhitelisted(!!w);
            await loadListings(m);
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

  const loadListings = async (m) => {
    if (!m) return;
    const out = [];

    if (m.methods.getListingCount) {
      const count = Number(await m.methods.getListingCount().call());
      for (let i = 0; i < count; i++) {
        const li = await m.methods.listings(i).call();
        out.push(normalizeListing(li, i));
      }
      setListings(out.filter((l) => !!l.active));
      return;
    }

    if (m.methods.nextListingId) {
      const count = Number(await m.methods.nextListingId().call());
      for (let i = 0; i < count; i++) {
        const li = await m.methods.listings(i).call();
        out.push(normalizeListing(li, i));
      }
      setListings(out.filter((l) => !!l.active));
      return;
    }

    if (m.methods.getActiveListings) {
      const arr = await m.methods.getActiveListings().call();
      setListings(arr.map((li, i) => normalizeListing(li, i)).filter((l) => !!l.active));
      return;
    }

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
    setListings(out.filter((l) => !!l.active));
  };

  const buy = async (l) => {
    if (!isWhitelisted) return alert("You must be whitelisted to buy.");
    if (!market || !web3) return alert("Contracts not ready");

    try {
      setStatus("⏳ Purchasing...");

      const raw = (buyAmountById[l.id] || "0").trim();
      const tokensBI = BigInt(raw || "0"); // whole tokens to buy
      if (tokensBI <= 0n) {
        setStatus("❌ Amount must be > 0");
        return;
      }

      const priceWeiBI = big(l.pricePerToken || "0"); // wei per token
      const totalWei = (tokensBI * priceWeiBI).toString();

      await market.methods
        .buy(l.id, tokensBI.toString()) // whole tokens
        .send({ from: account, value: totalWei });

      setStatus("✅ Purchase successful.");
      await loadListings(market);
    } catch (e) {
      setStatus("❌ Purchase failed: " + (e.message || e));
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>🛍️ Customer Marketplace</h1>
      <p><b>Account:</b> {account}</p>
      <p><b>Whitelist:</b> {isWhitelisted ? "✅ Verified" : "❌ Not Verified"}</p>

      {!isWhitelisted && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={requestWhitelist}>📨 Request Whitelist Approval</button>
        </div>
      )}

      <h3>🧾 Active Listings</h3>
      {listings.length === 0 ? (
        <p>No active listings.</p>
      ) : (
        listings.map((l) => {
          const amountTokens = String(l.amount || "0");
          const soldTokens   = String(l.sold || "0");
          const remaining    = (Number(amountTokens) - Number(soldTokens)).toString();
          const priceEth     = web3.utils.fromWei(String(l.pricePerToken || "0"), "ether");
          const mine         = l.seller?.toLowerCase() === account.toLowerCase();

          return (
            <div
              key={l.id}
              style={{
                border: "1px solid #ddd",
                padding: 12,
                marginBottom: 8,
                opacity: mine ? 0.6 : 1,
              }}
            >
              <p style={{ margin: 0 }}><b>Listing #{l.id}</b></p>
              <p style={{ margin: 0 }}>Seller: {l.seller}</p>
              <p style={{ margin: 0 }}>Price: {priceEth} ETH / token</p>
              <p style={{ margin: 0 }}>Total: {amountTokens} | Sold: {soldTokens} | Remaining: {remaining}</p>

              {!mine && isWhitelisted && (
                <div style={{ marginTop: 8 }}>
                  <input
                    placeholder="Amount to buy (whole tokens)"
                    value={buyAmountById[l.id] || ""}
                    onChange={(e) =>
                      setBuyAmountById({ ...buyAmountById, [l.id]: e.target.value })
                    }
                    style={{ marginRight: 8 }}
                  />
                  <button onClick={() => buy(l)}>Buy</button>
                </div>
              )}

              {mine && <p style={{ marginTop: 8, color: "#666" }}>You own this listing.</p>}
            </div>
          );
        })
      )}

      <p style={{ marginTop: 12 }}>{status}</p>
      <button style={{ marginTop: 6 }} onClick={() => loadListings(market)}>🔁 Refresh</button>
    </div>
  );
}
