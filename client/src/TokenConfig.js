// client/src/tokenConfig.js
import Web3 from "web3";
import TokenArtifact from "./contracts/ERC20Token.json";

let web3;
let token;

const loadBlockchain = async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });

    const networkId = await web3.eth.net.getId();
    const deployedNetwork = TokenArtifact.networks[networkId];

    if (!deployedNetwork) {
      alert("Contract not deployed on this network!");
      return null;
    }

    token = new web3.eth.Contract(TokenArtifact.abi, deployedNetwork.address);
    return { web3, token };
  } else {
    alert("Please install MetaMask!");
  }
};

export default loadBlockchain;
