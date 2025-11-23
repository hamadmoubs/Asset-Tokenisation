import Web3 from "web3";

export const getWeb3 = async () => {
  if (!window.ethereum) throw new Error("MetaMask not found. Please install it.");
  const w3 = new Web3(window.ethereum);
  await window.ethereum.request({ method: "eth_requestAccounts" });
  return w3;
};

export const isAddress = (addr) =>
  typeof addr === "string" && /^0x[0-9a-fA-F]{40}$/.test(addr);

export const nonZero = (addr) =>
  addr && addr !== "0x0000000000000000000000000000000000000000";
