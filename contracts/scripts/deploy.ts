import { ethers } from "hardhat";

/**
 * Deploys DigiPawnsEscrow v2 (UUPS upgradeable proxy) to the configured network.
 *
 * Deployment approach:
 *   1. Deploy the implementation (logic) contract — no constructor args (initializer disabled).
 *   2. ABI-encode the initialize(shopAddress, ownerAddress) call.
 *   3. Deploy ERC1967Proxy(implementation, initData) — this IS the permanent contract address.
 *   4. Attach the DigiPawnsEscrow ABI to the proxy address to run post-deploy config.
 *
 * Required env vars (set in contracts/.env or Replit Secrets):
 *   DEPLOYER_PRIVATE_KEY  — private key of the deployer wallet (becomes the owner)
 *   SHOP_ADDRESS          — wallet that receives defaulted NFT collateral
 *
 * Optional:
 *   BASE_MAINNET_RPC_URL  — defaults to https://mainnet.base.org
 *   BASE_SEPOLIA_RPC_URL  — defaults to https://sepolia.base.org (testnet)
 *   BASESCAN_API_KEY      — needed only for post-deploy contract verification
 *   APPROVED_COLLECTIONS  — comma-separated ERC-721 contract addresses to
 *                           approve on the allowlist immediately after deploy
 *
 * Usage (mainnet):
 *   npm run deploy:base
 *
 * Usage (testnet):
 *   npm run deploy:baseSepolia
 *
 * To verify the implementation on Basescan (NOT the proxy):
 *   npx hardhat verify --network base <IMPL_ADDRESS>          # mainnet
 *   npx hardhat verify --network baseSepolia <IMPL_ADDRESS>   # testnet
 * Then verify the proxy through Basescan's "Is this a Proxy?" UI.
 */
async function main() {
  const shopAddress = process.env.SHOP_ADDRESS;
  if (!shopAddress) {
    throw new Error("SHOP_ADDRESS env var is required — set it in contracts/.env");
  }
  if (!ethers.isAddress(shopAddress)) {
    throw new Error(`SHOP_ADDRESS is not a valid Ethereum address: ${shopAddress}`);
  }

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkArg = network.chainId === 8453n ? "base" : "baseSepolia";

  console.log("────────────────────────────────────────────────────────");
  console.log("DigiPawns Escrow v2 — UUPS proxy deployment");
  console.log("────────────────────────────────────────────────────────");
  console.log("Network  :", network.name, `(chainId ${network.chainId})`);
  console.log("Deployer :", deployer.address, "(becomes owner)");
  console.log("Shop     :", shopAddress);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance  :", ethers.formatEther(balance), "ETH");
  console.log("────────────────────────────────────────────────────────");

  // ── Step 1: Deploy the implementation (logic) contract ────────────────────
  process.stdout.write("1/3  Deploying implementation… ");
  const ImplFactory = await ethers.getContractFactory("DigiPawnsEscrow");
  const impl = await ImplFactory.deploy();
  await impl.waitForDeployment();
  const implAddress = await impl.getAddress();
  console.log("done.");
  console.log("     Implementation:", implAddress);

  // ── Step 2: Encode the initialize() call ──────────────────────────────────
  const initData = ImplFactory.interface.encodeFunctionData("initialize", [
    shopAddress,
    deployer.address, // initial owner
  ]);

  // ── Step 3: Deploy ERC1967Proxy (this is the permanent address) ───────────
  process.stdout.write("2/3  Deploying ERC1967Proxy… ");
  const ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
  const proxy = await ProxyFactory.deploy(implAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("done.");
  console.log("     Proxy (SAVE THIS):", proxyAddress);

  // ── Step 4: Attach escrow ABI to the proxy for post-deploy config ─────────
  const escrow = ImplFactory.attach(proxyAddress);

  // Verify initialization worked
  const owner = await (escrow as any).owner();
  const shop  = await (escrow as any).shopAddress();
  console.log("     Owner confirmed:", owner);
  console.log("     Shop  confirmed:", shop);

  // ── Step 5: Approve initial collections if provided ───────────────────────
  const rawCollections = process.env.APPROVED_COLLECTIONS;
  if (rawCollections) {
    const collections = rawCollections.split(",").map((s) => s.trim()).filter(Boolean);
    process.stdout.write(`3/3  Approving ${collections.length} collection(s)… `);
    for (const col of collections) {
      if (!ethers.isAddress(col)) {
        console.warn(`\n     Skipping invalid address: ${col}`);
        continue;
      }
      const tx = await (escrow as any).approveCollection(col);
      await tx.wait();
      console.log(`\n     ✓ ${col}`);
    }
    console.log("done.");
  } else {
    console.log("3/3  No APPROVED_COLLECTIONS set — skipping.");
  }

  console.log("────────────────────────────────────────────────────────");
  console.log("✅ Deployment complete");
  console.log("────────────────────────────────────────────────────────");
  console.log("\n📋 Next steps:");
  console.log("\n1. Add to Replit Secrets (use the PROXY address — never the impl):");
  console.log(`   VITE_ESCROW_ADDRESS=${proxyAddress}`);
  console.log("\n2. Verify the implementation on Basescan:");
  console.log(`   npx hardhat verify --network ${networkArg} ${implAddress}`);
  console.log(`   Then mark the proxy as a proxy at: https://basescan.org/address/${proxyAddress}`);
  console.log("\n3. Set $DIG/$PC token tier config (in Remix or via script):");
  console.log(`   escrow.setTokenTierConfig(digTokenAddress, digThreshold, pcTokenAddress, pcThreshold)`);
  console.log("\n4. Configure rewards:");
  console.log(`   escrow.setRewardConfig(rewardTokenAddress, baseRewardAmount, goldMultiplier)`);
  console.log("\n5. Fund the reward pool by sending reward tokens to the proxy address.");
  console.log("\n6. Approve collections if not set via APPROVED_COLLECTIONS:");
  console.log(`   escrow.approveCollection("0xYourNftContract")`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
