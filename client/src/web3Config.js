import Web3 from "web3";

let web3;

if (window.ethereum) {
  // Ask user to connect MetaMask
  web3 = new Web3(window.ethereum);
  window.ethereum.request({ method: "eth_requestAccounts" });
  console.log("✅ MetaMask detected and connected");
} else if (window.web3) {
  // Legacy dapp browsers
  web3 = new Web3(window.web3.currentProvider);
  console.log("⚠️ Using legacy web3 provider");
} else {
  // No MetaMask
  const ganacheUrl = "http://127.0.0.1:7545";
  web3 = new Web3(new Web3.providers.HttpProvider(ganacheUrl));
  console.log("🚨 No MetaMask found, using local Ganache RPC");
}

export default web3;
