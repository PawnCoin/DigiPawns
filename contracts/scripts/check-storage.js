const { ethers, upgrades } = require("hardhat");

async function main() {
  const oldLayout = await ethers.getContractFactory("DigiPawnsEscrowV2Layout");
  const candidate = await ethers.getContractFactory("DigiPawnsEscrowV3");
  await upgrades.validateUpgrade(oldLayout, candidate, {
    kind: "uups",
    unsafeAllow: ["constructor"],
  });
  console.log("Candidate is append-only compatible with the reconstructed supplied V2 layout.");
  console.log("Base Mainnet upgrade remains blocked until the exact live implementation layout is verified.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });


