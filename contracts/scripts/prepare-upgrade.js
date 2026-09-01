const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("hardhat");

const EXPECTED_CHAIN_ID = 8453n;
const EXPECTED_PROXY = "0x0FA851786bF8f1B0FE3AC0C2b4A0ec70BEc7a79d";
const EXPECTED_IMPLEMENTATION = "0x15059a4DE6C6C8Ac12626Ae50e470DCc32e2Fc23";
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

async function main() {
  const provider = ethers.provider;
  const network = await provider.getNetwork();
  if (network.chainId !== EXPECTED_CHAIN_ID) throw new Error(`Refusing chain ${network.chainId}; expected Base Mainnet (8453)`);

  const proxy = ethers.getAddress(process.env.ESCROW_PROXY || EXPECTED_PROXY);
  if (proxy !== ethers.getAddress(EXPECTED_PROXY)) throw new Error("Unexpected proxy address");
  const code = await provider.getCode(proxy);
  if (code === "0x") throw new Error("Proxy has no deployed code");

  const rawSlot = await provider.getStorage(proxy, IMPLEMENTATION_SLOT);
  const currentImplementation = ethers.getAddress(`0x${rawSlot.slice(-40)}`);
  if (currentImplementation !== ethers.getAddress(EXPECTED_IMPLEMENTATION)) {
    throw new Error(`Implementation changed: ${currentImplementation}`);
  }

  const ownerReader = new ethers.Contract(proxy, ["function owner() view returns (address)", "function paused() view returns (bool)"], provider);
  const currentOwner = await ownerReader.owner();
  const expectedOwner = ethers.getAddress(required("EXPECTED_PROXY_OWNER"));
  if (currentOwner !== expectedOwner) throw new Error(`Owner mismatch: ${currentOwner}`);
  if (!(await ownerReader.paused())) throw new Error("Pause the escrow before preparing an upgrade");

  const signer = ethers.getAddress(required("OFFER_SIGNER"));
  const candidateAddress = ethers.getAddress(required("CANDIDATE_IMPLEMENTATION"));
  if ((await provider.getCode(candidateAddress)) === "0x") throw new Error("Candidate implementation has no deployed code");
  const firstNewLoanId = BigInt(required("FIRST_NEW_LOAN_ID"));
  const activeLoansPath = path.resolve(required("ACTIVE_LOANS_JSON"));
  const activeLoans = JSON.parse(fs.readFileSync(activeLoansPath, "utf8"));
  if (!Array.isArray(activeLoans)) throw new Error("Active-loan inventory must be a JSON array");

  const Factory = await ethers.getContractFactory("DigiPawnsEscrowV3");
  const loanReader = new ethers.Contract(proxy, [
    "function getLoan(uint256) view returns (address borrower,address nftContract,uint256 tokenId,uint8 status,uint8 tier)",
  ], provider);
  const erc721 = ["function ownerOf(uint256) view returns (address)"];
  for (const item of activeLoans) {
    if (!item || item.loanId === undefined) throw new Error("Every migration entry needs loanId");
    const loanId = BigInt(item.loanId);
    if (loanId >= firstNewLoanId) throw new Error(`Legacy loan ${loanId} collides with FIRST_NEW_LOAN_ID`);
    const liveLoan = await loanReader.getLoan(loanId);
    if (liveLoan.borrower === ethers.ZeroAddress || Number(liveLoan.status) !== 0) throw new Error(`Loan ${loanId} is not active on-chain`);
    if (ethers.getAddress(item.nftContract) !== liveLoan.nftContract || BigInt(item.tokenId) !== liveLoan.tokenId) {
      throw new Error(`Collateral mismatch for loan ${loanId}`);
    }
    const nft = new ethers.Contract(liveLoan.nftContract, erc721, provider);
    if ((await nft.ownerOf(liveLoan.tokenId)) !== proxy) throw new Error(`Proxy does not own collateral for loan ${loanId}`);
  }

  const initData = Factory.interface.encodeFunctionData("initializeV3", [signer, firstNewLoanId, activeLoans.length]);
  const upgradeData = Factory.interface.encodeFunctionData("upgradeToAndCall", [candidateAddress, initData]);
  const migrationCalls = [];
  for (let offset = 0; offset < activeLoans.length; offset += 20) {
    migrationCalls.push(Factory.interface.encodeFunctionData("migrateLegacyLoans", [activeLoans.slice(offset, offset + 20)]));
  }

  const output = {
    chainId: network.chainId.toString(),
    proxy,
    currentImplementation,
    currentOwner,
    candidateImplementation: candidateAddress,
    offerSigner: signer,
    firstNewLoanId: firstNewLoanId.toString(),
    activeLoanCount: activeLoans.length,
    upgradeToAndCallData: upgradeData,
    migrationCalls,
    completeMigrationData: Factory.interface.encodeFunctionData("completeMigration"),
    unpauseData: Factory.interface.encodeFunctionData("unpause"),
    warning: "Proposal only. Do not execute until fork tests, exact storage-layout verification, migration review, multisig review, and independent audit pass.",
  };
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

