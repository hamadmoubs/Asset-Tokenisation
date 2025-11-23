import ERC20Artifact from "./ERC20ABI.json";
import KYCWhitelistArtifact from "./KYCWhitelistABI.json";
import MarketplaceArtifact from "./MarketplaceABI.json";

export const normalizeAbi = (artifactOrAbi) => {
  if (!artifactOrAbi) return null;
  if (Array.isArray(artifactOrAbi)) return artifactOrAbi;
  if (artifactOrAbi.abi && Array.isArray(artifactOrAbi.abi)) return artifactOrAbi.abi;
  if (artifactOrAbi.contracts && typeof artifactOrAbi.contracts === "object") {
    const first = Object.values(artifactOrAbi.contracts)[0];
    if (first && first.abi) return first.abi;
  }
  return null;
};

export const ERC20_ABI        = normalizeAbi(ERC20Artifact);
export const KYC_ABI          = normalizeAbi(KYCWhitelistArtifact);
export const MARKETPLACE_ABI  = normalizeAbi(MarketplaceArtifact);
