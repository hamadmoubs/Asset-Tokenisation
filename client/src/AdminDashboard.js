import React, { useEffect, useState } from "react";
import { getWeb3, isAddress } from "./_web3";
import { KYC_ABI } from "./_abi";
import { KYC_ADDRESS, ADMIN_ADDRESS } from "./_addresses";

export default function AdminDashboard() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [kyc, setKyc] = useState(null);
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const w3 = await getWeb3();
        const [acc] = await w3.eth.getAccounts();
        setWeb3(w3);
        setAccount(acc);

        if (!KYC_ABI) throw new Error("KYC ABI not loaded");
        if (!isAddress(KYC_ADDRESS)) throw new Error("Invalid KYC_ADDRESS");

        const kycC = new w3.eth.Contract(KYC_ABI, KYC_ADDRESS);
        setKyc(kycC);

        const pending = await kycC.methods.getPendingRequests().call();
        setRequests(pending);

        window.ethereum.on("accountsChanged", async (accs) => {
          setAccount(accs[0]);
          const nextPending = await kycC.methods.getPendingRequests().call();
          setRequests(nextPending);
        });
      } catch (e) {
        alert(e.message || e);
      }
    })();
  }, []);

  const refreshRequests = async () => {
    if (!kyc) return;
    const pending = await kyc.methods.getPendingRequests().call();
    setRequests(pending);
  };

  const approve = async (addr) => {
    try {
      setStatus("⏳ Approving...");
      // On-chain: only the contract owner can approve
      await kyc.methods.approveKYC(addr).send({ from: account });
      setStatus(`✅ Approved: ${addr}`);
      await refreshRequests();
    } catch (e) {
      setStatus("❌ Failed to approve request. Only contract owner can approve.");
      console.error(e);
    }
  };

  if (!account) return null;

  if (account.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "red" }}>
        ❌ Access Denied — Only Admin Can View This Page
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>👑 Admin Whitelist Dashboard</h1>
      <p><b>Connected Admin:</b> {account}</p>

      <h3>📬 Pending Requests</h3>
      {requests.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        requests.map((addr, i) => (
          <div key={i} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 8 }}>
            <p style={{ margin: 0 }}>{addr}</p>
            <button onClick={() => approve(addr)} style={{ marginTop: 6 }}>✅ Approve</button>
          </div>
        ))
      )}

      <p style={{ marginTop: 12 }}>{status}</p>
      <button onClick={refreshRequests} style={{ marginTop: 6 }}>🔁 Refresh</button>
    </div>
  );
}
