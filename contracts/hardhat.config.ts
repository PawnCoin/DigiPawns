import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config();

// Placeholder key so compilation/testing work without a real key.
// For deployment, set DEPLOYER_PRIVATE_KEY in Replit Secrets (with or without 0x prefix).
const rawKey = process.env.DEPLOYER_PRIVATE_KEY ?? "0".repeat(64);
const PRIVATE_KEY = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
const ETHEREUM_MAINNET_RPC =
  process.env.ETHEREUM_MAINNET_RPC_URL ?? "https://ethereum-rpc.publicnode.com";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Existing DigiPawns escrow proxy is deployed on Ethereum Mainnet.
    ethereum: {
      url: ETHEREUM_MAINNET_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 1,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

export default config;
