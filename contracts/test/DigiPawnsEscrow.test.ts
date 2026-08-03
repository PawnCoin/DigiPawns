import { expect } from "chai";
import { ethers } from "hardhat";
import { DigiPawnsEscrow, MockNFT, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const Status = { Active: 0n, Released: 1n, Swept: 2n };
const Tier   = { NONE: 0n, STANDARD: 1n, GOLD: 2n };

// ─── Helper: deploy the full UUPS proxy stack ─────────────────────────────────
async function deployProxy(shopAddress: string, ownerAddress: string): Promise<DigiPawnsEscrow> {
  // 1. Deploy implementation (constructor only disables initializers)
  const ImplFactory = await ethers.getContractFactory("DigiPawnsEscrow");
  const impl = await ImplFactory.deploy();
  await impl.waitForDeployment();

  // 2. Encode initialize(shop, owner)
  const initData = ImplFactory.interface.encodeFunctionData("initialize", [
    shopAddress,
    ownerAddress,
  ]);

  // 3. Deploy ERC1967Proxy — this is the permanent address
  const ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");
  const proxy = await ProxyFactory.deploy(await impl.getAddress(), initData);
  await proxy.waitForDeployment();

  // 4. Return the escrow interface attached to the proxy address
  return ImplFactory.attach(await proxy.getAddress()) as unknown as DigiPawnsEscrow;
}

// ─── Test suite ───────────────────────────────────────────────────────────────
describe("DigiPawnsEscrow v2", function () {
  let escrow: DigiPawnsEscrow;
  let nft: MockNFT;
  let digToken: MockERC20;
  let pcToken: MockERC20;
  let rewardToken: MockERC20;

  let owner: SignerWithAddress;
  let borrower: SignerWithAddress;
  let shop: SignerWithAddress;
  let other: SignerWithAddress;

  const LOAN_ID   = 42n;
  const LOAN_ID_2 = 99n;
  let TOKEN_ID: bigint;
  let escrowAddress: string;
  let nftAddress: string;

  beforeEach(async function () {
    [owner, borrower, shop, other] = await ethers.getSigners();

    // Mocks
    nft         = await ethers.deployContract("MockNFT");
    digToken    = await ethers.deployContract("MockERC20", ["DigiToken", "DIG"]);
    pcToken     = await ethers.deployContract("MockERC20", ["PCToken", "PC"]);
    rewardToken = await ethers.deployContract("MockERC20", ["Reward", "RWD"]);

    // Deploy proxy
    escrow = await deployProxy(shop.address, owner.address);
    escrowAddress = await escrow.getAddress();
    nftAddress    = await nft.getAddress();

    // Whitelist collection
    await escrow.connect(owner).approveCollection(nftAddress);

    // Mint NFT to borrower and approve escrow
    TOKEN_ID = await nft.connect(borrower).mint.staticCall(borrower.address);
    await nft.connect(borrower).mint(borrower.address);
    await nft.connect(borrower).approve(escrowAddress, TOKEN_ID);
  });

  // ─── Initializer ──────────────────────────────────────────────────────────

  describe("initialize", function () {
    it("sets the shop address", async function () {
      expect(await escrow.shopAddress()).to.equal(shop.address);
    });

    it("sets the initial owner", async function () {
      expect(await escrow.owner()).to.equal(owner.address);
    });

    it("defaults goldRewardMultiplier to 150", async function () {
      expect(await escrow.goldRewardMultiplier()).to.equal(150n);
    });

    it("reverts with zero shop address", async function () {
      await expect(deployProxy(ethers.ZeroAddress, owner.address))
        .to.be.revertedWith("Escrow: zero shop address");
    });

    it("reverts with zero owner address", async function () {
      await expect(deployProxy(shop.address, ethers.ZeroAddress))
        .to.be.revertedWith("Escrow: zero owner");
    });

    it("reverts if initialize is called again (already initialized)", async function () {
      await expect(
        escrow.initialize(shop.address, owner.address)
      ).to.be.revertedWithCustomError(escrow, "InvalidInitialization");
    });
  });

  // ─── approveCollection / revokeCollection ─────────────────────────────────

  describe("approveCollection / revokeCollection", function () {
    it("reflects approved status", async function () {
      expect(await escrow.approvedCollections(nftAddress)).to.be.true;
    });

    it("emits CollectionApproved", async function () {
      const nft2 = await ethers.deployContract("MockNFT");
      await expect(escrow.connect(owner).approveCollection(await nft2.getAddress()))
        .to.emit(escrow, "CollectionApproved")
        .withArgs(await nft2.getAddress());
    });

    it("emits CollectionRevoked", async function () {
      await expect(escrow.connect(owner).revokeCollection(nftAddress))
        .to.emit(escrow, "CollectionRevoked")
        .withArgs(nftAddress);
    });

    it("reverts approveCollection with zero address", async function () {
      await expect(escrow.connect(owner).approveCollection(ethers.ZeroAddress))
        .to.be.revertedWith("Escrow: zero address");
    });

    it("reverts approveCollection when called by non-owner", async function () {
      await expect(escrow.connect(other).approveCollection(nftAddress))
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("reverts depositNFT for a revoked collection", async function () {
      await escrow.connect(owner).revokeCollection(nftAddress);
      await expect(
        escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID)
      ).to.be.revertedWith("Escrow: collection not approved");
    });

    it("allows deposit again after re-approving a revoked collection", async function () {
      await escrow.connect(owner).revokeCollection(nftAddress);
      await escrow.connect(owner).approveCollection(nftAddress);
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(escrowAddress);
    });
  });

  // ─── Global pause ─────────────────────────────────────────────────────────

  describe("pause / unpause", function () {
    it("paused() returns false initially", async function () {
      expect(await escrow.paused()).to.be.false;
    });

    it("blocks depositNFT when paused", async function () {
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID)
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });

    it("blocks releaseToOwner when paused", async function () {
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(owner).releaseToOwner(LOAN_ID)
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });

    it("blocks sweepToShop when paused", async function () {
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(owner).sweepToShop(LOAN_ID)
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });

    it("resumes after unpause", async function () {
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      await escrow.connect(owner).pause();
      await escrow.connect(owner).unpause();
      await expect(escrow.connect(owner).releaseToOwner(LOAN_ID)).to.not.be.reverted;
    });

    it("reverts pause when called by non-owner", async function () {
      await expect(escrow.connect(other).pause())
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  // ─── Wallet blacklist ─────────────────────────────────────────────────────

  describe("blacklist / unblacklist", function () {
    it("blocks a blacklisted address from depositing", async function () {
      await escrow.connect(owner).blacklist(borrower.address);
      await expect(
        escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID)
      ).to.be.revertedWith("Escrow: address blacklisted");
    });

    it("emits AddressBlacklisted and AddressUnblacklisted", async function () {
      await expect(escrow.connect(owner).blacklist(borrower.address))
        .to.emit(escrow, "AddressBlacklisted")
        .withArgs(borrower.address);
      await expect(escrow.connect(owner).unblacklist(borrower.address))
        .to.emit(escrow, "AddressUnblacklisted")
        .withArgs(borrower.address);
    });

    it("allows deposit again after unblacklisting", async function () {
      await escrow.connect(owner).blacklist(borrower.address);
      await escrow.connect(owner).unblacklist(borrower.address);
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(escrowAddress);
    });

    it("blacklisted borrower's NFT can still be swept (admin recovery must not be blocked)", async function () {
      // Deposit first while not blacklisted
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      // Blacklist after deposit
      await escrow.connect(owner).blacklist(borrower.address);
      // Sweep must succeed
      await expect(escrow.connect(owner).sweepToShop(LOAN_ID)).to.not.be.reverted;
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(shop.address);
    });

    it("reverts blacklist with zero address", async function () {
      await expect(escrow.connect(owner).blacklist(ethers.ZeroAddress))
        .to.be.revertedWith("Escrow: zero address");
    });

    it("reverts when called by non-owner", async function () {
      await expect(escrow.connect(other).blacklist(borrower.address))
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  // ─── Loan freeze ──────────────────────────────────────────────────────────

  describe("freezeLoan / unfreezeLoan", function () {
    beforeEach(async function () {
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
    });

    it("blocks releaseToOwner on a frozen loan", async function () {
      await escrow.connect(owner).freezeLoan(LOAN_ID);
      await expect(escrow.connect(owner).releaseToOwner(LOAN_ID))
        .to.be.revertedWith("Escrow: loan is frozen");
    });

    it("blocks sweepToShop on a frozen loan", async function () {
      await escrow.connect(owner).freezeLoan(LOAN_ID);
      await expect(escrow.connect(owner).sweepToShop(LOAN_ID))
        .to.be.revertedWith("Escrow: loan is frozen");
    });

    it("emits LoanFrozen and LoanUnfrozen", async function () {
      await expect(escrow.connect(owner).freezeLoan(LOAN_ID))
        .to.emit(escrow, "LoanFrozen")
        .withArgs(LOAN_ID);
      await expect(escrow.connect(owner).unfreezeLoan(LOAN_ID))
        .to.emit(escrow, "LoanUnfrozen")
        .withArgs(LOAN_ID);
    });

    it("allows release after unfreezing", async function () {
      await escrow.connect(owner).freezeLoan(LOAN_ID);
      await escrow.connect(owner).unfreezeLoan(LOAN_ID);
      await expect(escrow.connect(owner).releaseToOwner(LOAN_ID)).to.not.be.reverted;
    });

    it("reverts freezeLoan for a non-existent loan", async function () {
      await expect(escrow.connect(owner).freezeLoan(999n))
        .to.be.revertedWith("Escrow: loan not found");
    });

    it("reverts when called by non-owner", async function () {
      await expect(escrow.connect(other).freezeLoan(LOAN_ID))
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  // ─── Tier detection ───────────────────────────────────────────────────────

  describe("tier detection (depositNFT + getTierForAddress)", function () {
    const DIG_GOLD_THRESHOLD = ethers.parseEther("1000");
    const PC_GOLD_THRESHOLD  = ethers.parseEther("500");

    beforeEach(async function () {
      await escrow.connect(owner).setTokenTierConfig(
        await digToken.getAddress(), DIG_GOLD_THRESHOLD,
        await pcToken.getAddress(), PC_GOLD_THRESHOLD
      );
    });

    it("assigns NONE tier when borrower holds no platform tokens", async function () {
      expect(await escrow.getTierForAddress(borrower.address)).to.equal(Tier.NONE);
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      expect((await escrow.getLoan(LOAN_ID)).tier).to.equal(Tier.NONE);
    });

    it("assigns STANDARD tier when borrower holds some $DIG (below threshold)", async function () {
      await digToken.mint(borrower.address, ethers.parseEther("10"));
      expect(await escrow.getTierForAddress(borrower.address)).to.equal(Tier.STANDARD);
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      expect((await escrow.getLoan(LOAN_ID)).tier).to.equal(Tier.STANDARD);
    });

    it("assigns GOLD tier when borrower meets $DIG threshold", async function () {
      await digToken.mint(borrower.address, DIG_GOLD_THRESHOLD);
      expect(await escrow.getTierForAddress(borrower.address)).to.equal(Tier.GOLD);
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      expect((await escrow.getLoan(LOAN_ID)).tier).to.equal(Tier.GOLD);
    });

    it("assigns GOLD tier when borrower meets $PC threshold (not $DIG)", async function () {
      await pcToken.mint(borrower.address, PC_GOLD_THRESHOLD);
      expect(await escrow.getTierForAddress(borrower.address)).to.equal(Tier.GOLD);
    });

    it("assigns STANDARD when borrower has $PC but below threshold", async function () {
      await pcToken.mint(borrower.address, ethers.parseEther("1"));
      expect(await escrow.getTierForAddress(borrower.address)).to.equal(Tier.STANDARD);
    });

    it("emits NFTDeposited with correct tier", async function () {
      await digToken.mint(borrower.address, DIG_GOLD_THRESHOLD);
      await expect(
        escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID)
      )
        .to.emit(escrow, "NFTDeposited")
        .withArgs(LOAN_ID, borrower.address, nftAddress, TOKEN_ID, Tier.GOLD);
    });

    it("emits TokenTierConfigUpdated when config changes", async function () {
      await expect(
        escrow.connect(owner).setTokenTierConfig(
          await digToken.getAddress(), DIG_GOLD_THRESHOLD,
          await pcToken.getAddress(), PC_GOLD_THRESHOLD
        )
      ).to.emit(escrow, "TokenTierConfigUpdated");
    });
  });

  // ─── Reward system ────────────────────────────────────────────────────────

  describe("reward system", function () {
    const BASE_REWARD      = ethers.parseEther("10");
    const GOLD_MULTIPLIER  = 150n; // 1.5×
    const POOL_FUNDING     = ethers.parseEther("1000");
    const DIG_THRESHOLD    = ethers.parseEther("1000");

    beforeEach(async function () {
      // Configure tiers
      await escrow.connect(owner).setTokenTierConfig(
        await digToken.getAddress(), DIG_THRESHOLD,
        ethers.ZeroAddress, 0n
      );
      // Configure rewards
      await escrow.connect(owner).setRewardConfig(
        await rewardToken.getAddress(), BASE_REWARD, GOLD_MULTIPLIER
      );
      // Fund the pool
      await rewardToken.mint(escrowAddress, POOL_FUNDING);
    });

    it("pays base reward to STANDARD-tier borrower on release", async function () {
      // Give borrower some DIG (below threshold → STANDARD)
      await digToken.mint(borrower.address, ethers.parseEther("1"));

      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      const before = await rewardToken.balanceOf(borrower.address);
      await escrow.connect(owner).releaseToOwner(LOAN_ID);
      const after = await rewardToken.balanceOf(borrower.address);

      expect(after - before).to.equal(BASE_REWARD);
    });

    it("pays multiplied reward to GOLD-tier borrower on release", async function () {
      await digToken.mint(borrower.address, DIG_THRESHOLD);

      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      const before = await rewardToken.balanceOf(borrower.address);
      await escrow.connect(owner).releaseToOwner(LOAN_ID);
      const after = await rewardToken.balanceOf(borrower.address);

      const expected = (BASE_REWARD * GOLD_MULTIPLIER) / 100n;
      expect(after - before).to.equal(expected);
    });

    it("pays no reward to NONE-tier borrower", async function () {
      // borrower holds no tokens → NONE tier
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      const before = await rewardToken.balanceOf(borrower.address);
      await escrow.connect(owner).releaseToOwner(LOAN_ID);
      const after = await rewardToken.balanceOf(borrower.address);

      expect(after - before).to.equal(0n);
    });

    it("emits RewardPaid on successful reward", async function () {
      await digToken.mint(borrower.address, ethers.parseEther("1")); // STANDARD
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);

      await expect(escrow.connect(owner).releaseToOwner(LOAN_ID))
        .to.emit(escrow, "RewardPaid")
        .withArgs(LOAN_ID, borrower.address, await rewardToken.getAddress(), BASE_REWARD);
    });

    it("emits RewardPoolInsufficient and skips reward when pool is empty", async function () {
      // Drain pool to zero
      await escrow.connect(owner).withdrawRewardPool(owner.address, POOL_FUNDING);

      await digToken.mint(borrower.address, ethers.parseEther("1")); // STANDARD
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);

      const before = await rewardToken.balanceOf(borrower.address);
      await expect(escrow.connect(owner).releaseToOwner(LOAN_ID))
        .to.emit(escrow, "RewardPoolInsufficient");
      const after = await rewardToken.balanceOf(borrower.address);
      expect(after - before).to.equal(0n); // NFT returned but no token reward
    });

    it("no reward is paid on sweep (default)", async function () {
      await digToken.mint(borrower.address, DIG_THRESHOLD); // GOLD
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      const before = await rewardToken.balanceOf(borrower.address);
      await escrow.connect(owner).sweepToShop(LOAN_ID);
      const after = await rewardToken.balanceOf(borrower.address);
      expect(after - before).to.equal(0n);
    });

    it("previewReward returns (token, amount) for an active loan", async function () {
      await digToken.mint(borrower.address, ethers.parseEther("1")); // STANDARD
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      const [token, amount] = await escrow.previewReward(LOAN_ID);
      expect(token).to.equal(await rewardToken.getAddress());
      expect(amount).to.equal(BASE_REWARD);
    });

    it("previewReward returns (zero, 0) for NONE-tier loan", async function () {
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      const [token, amount] = await escrow.previewReward(LOAN_ID);
      expect(token).to.equal(ethers.ZeroAddress);
      expect(amount).to.equal(0n);
    });

    it("withdrawRewardPool removes tokens from the contract", async function () {
      const before = await rewardToken.balanceOf(owner.address);
      await escrow.connect(owner).withdrawRewardPool(owner.address, BASE_REWARD);
      const after = await rewardToken.balanceOf(owner.address);
      expect(after - before).to.equal(BASE_REWARD);
    });

    it("reverts withdrawRewardPool when called by non-owner", async function () {
      await expect(
        escrow.connect(other).withdrawRewardPool(other.address, BASE_REWARD)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("emits RewardConfigUpdated", async function () {
      await expect(
        escrow.connect(owner).setRewardConfig(
          await rewardToken.getAddress(), BASE_REWARD, 200n
        )
      ).to.emit(escrow, "RewardConfigUpdated");
    });

    it("reverts setRewardConfig when goldMultiplier < 100", async function () {
      await expect(
        escrow.connect(owner).setRewardConfig(
          await rewardToken.getAddress(), BASE_REWARD, 99n
        )
      ).to.be.revertedWith("Escrow: multiplier must be >= 100");
    });
  });

  // ─── depositNFT ───────────────────────────────────────────────────────────

  describe("depositNFT", function () {
    it("transfers the NFT to escrow and records the loan", async function () {
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(escrowAddress);
      const loan = await escrow.getLoan(LOAN_ID);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.nftContract).to.equal(nftAddress);
      expect(loan.tokenId).to.equal(TOKEN_ID);
      expect(loan.status).to.equal(Status.Active);
    });

    it("reverts if the loan ID is already in use", async function () {
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      const TOKEN_ID_2 = await nft.connect(borrower).mint.staticCall(borrower.address);
      await nft.connect(borrower).mint(borrower.address);
      await nft.connect(borrower).approve(escrowAddress, TOKEN_ID_2);
      await expect(
        escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID_2)
      ).to.be.revertedWith("Escrow: loan ID already used");
    });

    it("reverts with zero NFT contract address", async function () {
      await expect(
        escrow.connect(borrower).depositNFT(LOAN_ID, ethers.ZeroAddress, TOKEN_ID)
      ).to.be.revertedWith("Escrow: zero NFT contract");
    });

    it("reverts for an unapproved collection", async function () {
      const unapprovedNft = await ethers.deployContract("MockNFT");
      const tid = await unapprovedNft.connect(borrower).mint.staticCall(borrower.address);
      await unapprovedNft.connect(borrower).mint(borrower.address);
      await unapprovedNft.connect(borrower).approve(escrowAddress, tid);
      await expect(
        escrow.connect(borrower).depositNFT(LOAN_ID, await unapprovedNft.getAddress(), tid)
      ).to.be.revertedWith("Escrow: collection not approved");
    });
  });

  // ─── releaseToOwner ───────────────────────────────────────────────────────

  describe("releaseToOwner", function () {
    beforeEach(async function () {
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
    });

    it("returns the NFT to the borrower", async function () {
      await escrow.connect(owner).releaseToOwner(LOAN_ID);
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(borrower.address);
    });

    it("marks the loan as Released", async function () {
      await escrow.connect(owner).releaseToOwner(LOAN_ID);
      expect((await escrow.getLoan(LOAN_ID)).status).to.equal(Status.Released);
    });

    it("emits NFTReleased", async function () {
      await expect(escrow.connect(owner).releaseToOwner(LOAN_ID))
        .to.emit(escrow, "NFTReleased")
        .withArgs(LOAN_ID, borrower.address, nftAddress, TOKEN_ID);
    });

    it("reverts for a non-existent loan ID", async function () {
      await expect(escrow.connect(owner).releaseToOwner(999n))
        .to.be.revertedWith("Escrow: loan not found");
    });

    it("reverts if already Released", async function () {
      await escrow.connect(owner).releaseToOwner(LOAN_ID);
      await expect(escrow.connect(owner).releaseToOwner(LOAN_ID))
        .to.be.revertedWith("Escrow: loan not active");
    });

    it("reverts if already Swept", async function () {
      await escrow.connect(owner).sweepToShop(LOAN_ID);
      await expect(escrow.connect(owner).releaseToOwner(LOAN_ID))
        .to.be.revertedWith("Escrow: loan not active");
    });

    it("reverts when called by a non-owner", async function () {
      await expect(escrow.connect(other).releaseToOwner(LOAN_ID))
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  // ─── sweepToShop ──────────────────────────────────────────────────────────

  describe("sweepToShop", function () {
    beforeEach(async function () {
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
    });

    it("sends the NFT to the shop address", async function () {
      await escrow.connect(owner).sweepToShop(LOAN_ID);
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(shop.address);
    });

    it("marks the loan as Swept", async function () {
      await escrow.connect(owner).sweepToShop(LOAN_ID);
      expect((await escrow.getLoan(LOAN_ID)).status).to.equal(Status.Swept);
    });

    it("emits NFTSweptToShop", async function () {
      await expect(escrow.connect(owner).sweepToShop(LOAN_ID))
        .to.emit(escrow, "NFTSweptToShop")
        .withArgs(LOAN_ID, shop.address, nftAddress, TOKEN_ID);
    });

    it("reverts for a non-existent loan ID", async function () {
      await expect(escrow.connect(owner).sweepToShop(999n))
        .to.be.revertedWith("Escrow: loan not found");
    });

    it("reverts when called by a non-owner", async function () {
      await expect(escrow.connect(other).sweepToShop(LOAN_ID))
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  // ─── updateShopAddress ────────────────────────────────────────────────────

  describe("updateShopAddress", function () {
    it("updates the shop address and emits event", async function () {
      await expect(escrow.connect(owner).updateShopAddress(other.address))
        .to.emit(escrow, "ShopAddressUpdated")
        .withArgs(shop.address, other.address);
      expect(await escrow.shopAddress()).to.equal(other.address);
    });

    it("sweeps to the updated shop address", async function () {
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      await escrow.connect(owner).updateShopAddress(other.address);
      await escrow.connect(owner).sweepToShop(LOAN_ID);
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(other.address);
    });

    it("reverts with zero address", async function () {
      await expect(escrow.connect(owner).updateShopAddress(ethers.ZeroAddress))
        .to.be.revertedWith("Escrow: zero shop address");
    });

    it("reverts when called by non-owner", async function () {
      await expect(escrow.connect(other).updateShopAddress(other.address))
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  // ─── getLoan ──────────────────────────────────────────────────────────────

  describe("getLoan", function () {
    it("returns a zeroed struct for an unused loan ID", async function () {
      const loan = await escrow.getLoan(999n);
      expect(loan.borrower).to.equal(ethers.ZeroAddress);
      expect(loan.tokenId).to.equal(0n);
      expect(loan.status).to.equal(Status.Active);
    });

    it("includes tier in the returned struct", async function () {
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      const loan = await escrow.getLoan(LOAN_ID);
      expect(loan.tier).to.equal(Tier.NONE); // no tokens minted
    });
  });

  // ─── UUPS upgrade ─────────────────────────────────────────────────────────

  describe("UUPS upgrade", function () {
    it("non-owner cannot call upgradeToAndCall", async function () {
      const ImplFactory = await ethers.getContractFactory("DigiPawnsEscrow");
      const impl2 = await ImplFactory.deploy();
      await impl2.waitForDeployment();

      await expect(
        (escrow.connect(other) as any).upgradeToAndCall(await impl2.getAddress(), "0x")
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("owner can upgrade and data is preserved", async function () {
      // Deposit a loan before upgrade
      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);

      // Deploy new implementation
      const ImplFactory = await ethers.getContractFactory("DigiPawnsEscrow");
      const impl2 = await ImplFactory.deploy();
      await impl2.waitForDeployment();

      // Upgrade (owner calls upgradeToAndCall with empty calldata)
      await expect(
        (escrow.connect(owner) as any).upgradeToAndCall(await impl2.getAddress(), "0x")
      ).to.not.be.reverted;

      // Data preserved after upgrade
      const loan = await escrow.getLoan(LOAN_ID);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.status).to.equal(Status.Active);
    });
  });

  // ─── Multiple loans ───────────────────────────────────────────────────────

  describe("multiple loans", function () {
    it("handles independent loans for the same borrower", async function () {
      const TOKEN_ID_2 = await nft.connect(borrower).mint.staticCall(borrower.address);
      await nft.connect(borrower).mint(borrower.address);
      await nft.connect(borrower).approve(escrowAddress, TOKEN_ID_2);

      await escrow.connect(borrower).depositNFT(LOAN_ID, nftAddress, TOKEN_ID);
      await escrow.connect(borrower).depositNFT(LOAN_ID_2, nftAddress, TOKEN_ID_2);

      await escrow.connect(owner).releaseToOwner(LOAN_ID);
      await escrow.connect(owner).sweepToShop(LOAN_ID_2);

      expect(await nft.ownerOf(TOKEN_ID)).to.equal(borrower.address);
      expect(await nft.ownerOf(TOKEN_ID_2)).to.equal(shop.address);
    });
  });
});
