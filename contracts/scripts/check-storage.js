const { ethers, upgrades } = require("hardhat");

async function main() {
  const oldLayout = await ethers.getContractFactory("DigiPawnsEscrowV2Layout");
  const candidate = await ethers.getContractFactory("DigiPawnsEscrowV3");
  await upgrades.validateUpgrade(oldLayout, candidate, {
    kind: "uups",
    unsafeAllow: ["constructor"],
  });
  console.log("Candidate is append-only compatible with the exact recovered live V2 layout.");
  console.log("Live implementation artifact: Remix build-info 7df5c5859ff0563ae397db9d1f5a2b80.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

