import React, { useState } from "react";
import VendorDashboard from "./VendorDashboard";
import CustomerMarketplace from "./CustomerMarketplace";
import AdminDashboard from "./AdminDashboard";

export default function App() {
  const [view, setView] = useState("customer"); // "customer" | "vendor" | "admin"

  return (
    <div>
      <div style={{ display: "flex", gap: 12, padding: 16 }}>
        <button onClick={() => setView("customer")}>🛍️ Customer</button>
        <button onClick={() => setView("vendor")}>🏪 Vendor</button>
        <button onClick={() => setView("admin")}>👑 Admin</button>
      </div>
      {view === "customer" && <CustomerMarketplace />}
      {view === "vendor" && <VendorDashboard />}
      {view === "admin" && <AdminDashboard />}
    </div>
  );
}
