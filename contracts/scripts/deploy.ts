import { ethers } from "hardhat";

/**
 * Deploys DigiPawnsEscrow to the configured network.
 *
 * Required env vars (set in contracts/.env):
 *   DEPLOYER_PRIVATE_KEY  — private key of the deployer wallet
 *   SHOP_ADDRESS          — wallet that receives defaulted NFT collateral
 *
 * Optional:
 *   BASE_SEPOLIA_RPC_URL  — defaults to https://sepolia.base.org
 *   BASESCAN_API_KEY      — needed only for post-deploy contract verification
 *
 * Usage:
 *   npm run deploy:baseSepolia
 *
 * After deployment, verify on Basescan:
 *   npx hardhat verify --network baseSepolia <DEPLOYED_ADDRESS> "<SHOP_ADDRESS>"
 */
async function main() {
  const shopAddress = process.env.SHOP_ADDRESS;
  if (!shopAddress) {
    throw new Error(
      "SHOP_ADDRESS env var is required — set it in contracts/.env"
    );
  }
  if (!ethers.isAddress(shopAddress)) {
    throw new Error(`SHOP_ADDRESS is not a valid Ethereum address: ${shopAddress}`);
  }

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("────────────────────────────────────────");
  console.log("DigiPawns Escrow — deployment");
  console.log("────────────────────────────────────────");
  console.log("Network  :", network.name, `(chainId ${network.chainId})`);
  console.log("Deployer :", deployer.address);
  console.log("Shop     :", shopAddress);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance  :", ethers.formatEther(balance), "ETH");
  console.log("────────────────────────────────────────");

  const Escrow = await ethers.getContractFactory("DigiPawnsEscrow");
  const escrow = await Escrow.deploy(shopAddress);

  process.stdout.write("Deploying… ");
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("done.");
  console.log("────────────────────────────────────────");
  console.log("DigiPawnsEscrow deployed to:", address);
  console.log("────────────────────────────────────────");
  console.log("\nSave this address, then run:");
  console.log(
    `  npx hardhat verify --network baseSepolia ${address} "${shopAddress}"`
  );
  console.log(
    "\nAdd to your frontend .env / Replit Secrets:"
  );
  console.log(`  VITE_ESCROW_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
