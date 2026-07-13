import { expect } from "chai";
import { ethers } from "hardhat";
import { DigiPawnsEscrow, MockNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const Status = { Active: 0n, Released: 1n, Swept: 2n };

describe("DigiPawnsEscrow", function () {
  let escrow: DigiPawnsEscrow;
  let nft: MockNFT;

  let owner: SignerWithAddress;
  let borrower: SignerWithAddress;
  let shop: SignerWithAddress;
  let other: SignerWithAddress;

  const LOAN_ID = 42n;
  let TOKEN_ID: bigint;
  let escrowAddress: string;

  beforeEach(async function () {
    [owner, borrower, shop, other] = await ethers.getSigners();

    nft = await ethers.deployContract("MockNFT");
    escrow = await ethers.deployContract("DigiPawnsEscrow", [shop.address]);
    escrowAddress = await escrow.getAddress();

    // Approve MockNFT as a valid collateral collection (required after allowlist addition)
    await escrow.connect(owner).approveCollection(await nft.getAddress());

    // Mint token 0 to borrower and approve escrow
    TOKEN_ID = await nft.connect(borrower).mint.staticCall(borrower.address);
    await nft.connect(borrower).mint(borrower.address);
    await nft.connect(borrower).approve(escrowAddress, TOKEN_ID);
  });

  // ─── Constructor ─────────────────────────────────────────────────────────

  describe("constructor", function () {
    it("sets the shop address", async function () {
      expect(await escrow.shopAddress()).to.equal(shop.address);
    });

    it("sets the deployer as owner", async function () {
      expect(await escrow.owner()).to.equal(owner.address);
    });

    it("reverts with zero shop address", async function () {
      await expect(
        ethers.deployContract("DigiPawnsEscrow", [ethers.ZeroAddress])
      ).to.be.revertedWith("Escrow: zero shop address");
    });
  });

  // ─── approveCollection / revokeCollection ────────────────────────────────

  describe("approveCollection / revokeCollection", function () {
    it("reflects approved status set in beforeEach", async function () {
      expect(await escrow.approvedCollections(await nft.getAddress())).to.be.true;
    });

    it("emits CollectionApproved", async function () {
      const newNft = await ethers.deployContract("MockNFT");
      await expect(escrow.connect(owner).approveCollection(await newNft.getAddress()))
        .to.emit(escrow, "CollectionApproved")
        .withArgs(await newNft.getAddress());
    });

    it("emits CollectionRevoked", async function () {
      await expect(escrow.connect(owner).revokeCollection(await nft.getAddress()))
        .to.emit(escrow, "CollectionRevoked")
        .withArgs(await nft.getAddress());
    });

    it("reverts approveCollection with zero address", async function () {
      await expect(
        escrow.connect(owner).approveCollection(ethers.ZeroAddress)
      ).to.be.revertedWith("Escrow: zero address");
    });

    it("reverts approveCollection when called by non-owner", async function () {
      await expect(
        escrow.connect(other).approveCollection(await nft.getAddress())
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("reverts revokeCollection when called by non-owner", async function () {
      await expect(
        escrow.connect(other).revokeCollection(await nft.getAddress())
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("reverts depositNFT for a revoked collection", async function () {
      await escrow.connect(owner).revokeCollection(await nft.getAddress());
      await expect(
        escrow.connect(borrower).depositNFT(LOAN_ID, await nft.getAddress(), TOKEN_ID)
      ).to.be.revertedWith("Escrow: collection not approved");
    });

    it("allows deposit again after re-approving a revoked collection", async function () {
      await escrow.connect(owner).revokeCollection(await nft.getAddress());
      await escrow.connect(owner).approveCollection(await nft.getAddress());
      await escrow.connect(borrower).depositNFT(LOAN_ID, await nft.getAddress(), TOKEN_ID);
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(escrowAddress);
    });

    it("reverts depositNFT for an entirely unapproved collection", async function () {
      const unapprovedNft = await ethers.deployContract("MockNFT");
      const unapprovedTokenId = await unapprovedNft.connect(borrower).mint.staticCall(borrower.address);
      await unapprovedNft.connect(borrower).mint(borrower.address);
      await unapprovedNft.connect(borrower).approve(escrowAddress, unapprovedTokenId);

      await expect(
        escrow.connect(borrower).depositNFT(LOAN_ID, await unapprovedNft.getAddress(), unapprovedTokenId)
      ).to.be.revertedWith("Escrow: collection not approved");
    });
  });

  // ─── depositNFT ──────────────────────────────────────────────────────────

  describe("depositNFT", function () {
    it("transfers the NFT to escrow and records the loan", async function () {
      await escrow
        .connect(borrower)
        .depositNFT(LOAN_ID, await nft.getAddress(), TOKEN_ID);

      expect(await nft.ownerOf(TOKEN_ID)).to.equal(escrowAddress);

      const loan = await escrow.getLoan(LOAN_ID);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.nftContract).to.equal(await nft.getAddress());
      expect(loan.tokenId).to.equal(TOKEN_ID);
      expect(loan.status).to.equal(Status.Active);
    });

    it("emits NFTDeposited", async function () {
      await expect(
        escrow
          .connect(borrower)
          .depositNFT(LOAN_ID, await nft.getAddress(), TOKEN_ID)
      )
        .to.emit(escrow, "NFTDeposited")
        .withArgs(LOAN_ID, borrower.address, await nft.getAddress(), TOKEN_ID);
    });

    it("reverts if the loan ID is already in use", async function () {
      await escrow
        .connect(borrower)
        .depositNFT(LOAN_ID, await nft.getAddress(), TOKEN_ID);

      const TOKEN_ID_2 = await nft.connect(borrower).mint.staticCall(borrower.address);
      await nft.connect(borrower).mint(borrower.address);
      await nft.connect(borrower).approve(escrowAddress, TOKEN_ID_2);

      await expect(
        escrow
          .connect(borrower)
          .depositNFT(LOAN_ID, await nft.getAddress(), TOKEN_ID_2)
      ).to.be.revertedWith("Escrow: loan ID already used");
    });

    it("reverts with zero NFT contract address", async function () {
      await expect(
        escrow.connect(borrower).depositNFT(LOAN_ID, ethers.ZeroAddress, TOKEN_ID)
      ).to.be.revertedWith("Escrow: zero NFT contract");
    });

    it("reverts if caller does not own the NFT", async function () {
      await expect(
        escrow.connect(other).depositNFT(LOAN_ID, await nft.getAddress(), TOKEN_ID)
      ).to.be.reverted;
    });

    it("reverts if escrow is not approved", async function () {
      const TOKEN_ID_2 = await nft.connect(borrower).mint.staticCall(borrower.address);
      await nft.connect(borrower).mint(borrower.address);
      // No approve call

      await expect(
        escrow.connect(borrower).depositNFT(99n, await nft.getAddress(), TOKEN_ID_2)
      ).to.be.reverted;
    });
  });

  // ─── releaseToOwner ──────────────────────────────────────────────────────

  describe("releaseToOwner", function () {
    beforeEach(async function () {
      await escrow
        .connect(borrower)
        .depositNFT(LOAN_ID, await nft.getAddress(), TOKEN_ID);
    });

    it("returns the NFT to the borrower", async function () {
      await escrow.connect(owner).releaseToOwner(LOAN_ID);
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(borrower.address);
    });

    it("marks the loan as Released", async function () {
      await escrow.connect(owner).releaseToOwner(LOAN_ID);
      const loan = await escrow.getLoan(LOAN_ID);
      expect(loan.status).to.equal(Status.Released);
    });

    it("emits NFTReleased", async function () {
      await expect(escrow.connect(owner).releaseToOwner(LOAN_ID))
        .to.emit(escrow, "NFTReleased")
        .withArgs(LOAN_ID, borrower.address, await nft.getAddress(), TOKEN_ID);
    });

    it("reverts for a non-existent loan ID", async function () {
      await expect(
        escrow.connect(owner).releaseToOwner(999n)
      ).to.be.revertedWith("Escrow: loan not found");
    });

    it("reverts if already Released", async function () {
      await escrow.connect(owner).releaseToOwner(LOAN_ID);
      await expect(
        escrow.connect(owner).releaseToOwner(LOAN_ID)
      ).to.be.revertedWith("Escrow: loan not active");
    });

    it("reverts if already Swept", async function () {
      await escrow.connect(owner).sweepToShop(LOAN_ID);
      await expect(
        escrow.connect(owner).releaseToOwner(LOAN_ID)
      ).to.be.revertedWith("Escrow: loan not active");
    });

    it("reverts when called by a non-owner", async function () {
      await expect(
        escrow.connect(other).releaseToOwner(LOAN_ID)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("reverts when called by the borrower themselves", async function () {
      await expect(
        escrow.connect(borrower).releaseToOwner(LOAN_ID)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  // ─── sweepToShop ─────────────────────────────────────────────────────────

  describe("sweepToShop", function () {
    beforeEach(async function () {
      await escrow
        .connect(borrower)
        .depositNFT(LOAN_ID, await nft.getAddress(), TOKEN_ID);
    });

    it("sends the NFT to the shop address", async function () {
      await escrow.connect(owner).sweepToShop(LOAN_ID);
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(shop.address);
    });

    it("marks the loan as Swept", async function () {
      await escrow.connect(owner).sweepToShop(LOAN_ID);
      const loan = await escrow.getLoan(LOAN_ID);
      expect(loan.status).to.equal(Status.Swept);
    });

    it("emits NFTSweptToShop", async function () {
      await expect(escrow.connect(owner).sweepToShop(LOAN_ID))
        .to.emit(escrow, "NFTSweptToShop")
        .withArgs(LOAN_ID, shop.address, await nft.getAddress(), TOKEN_ID);
    });

    it("reverts for a non-existent loan ID", async function () {
      await expect(
        escrow.connect(owner).sweepToShop(999n)
      ).to.be.revertedWith("Escrow: loan not found");
    });

    it("reverts if already Swept", async function () {
      await escrow.connect(owner).sweepToShop(LOAN_ID);
      await expect(
        escrow.connect(owner).sweepToShop(LOAN_ID)
      ).to.be.revertedWith("Escrow: loan not active");
    });

    it("reverts if already Released", async function () {
      await escrow.connect(owner).releaseToOwner(LOAN_ID);
      await expect(
        escrow.connect(owner).sweepToShop(LOAN_ID)
      ).to.be.revertedWith("Escrow: loan not active");
    });

    it("reverts when called by a non-owner", async function () {
      await expect(
        escrow.connect(other).sweepToShop(LOAN_ID)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("reverts when called by the borrower themselves", async function () {
      await expect(
        escrow.connect(borrower).sweepToShop(LOAN_ID)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  // ─── updateShopAddress ───────────────────────────────────────────────────

  describe("updateShopAddress", function () {
    it("updates the shop address", async function () {
      await escrow.connect(owner).updateShopAddress(other.address);
      expect(await escrow.shopAddress()).to.equal(other.address);
    });

    it("emits ShopAddressUpdated", async function () {
      await expect(escrow.connect(owner).updateShopAddress(other.address))
        .to.emit(escrow, "ShopAddressUpdated")
        .withArgs(shop.address, other.address);
    });

    it("reverts with zero address", async function () {
      await expect(
        escrow.connect(owner).updateShopAddress(ethers.ZeroAddress)
      ).to.be.revertedWith("Escrow: zero shop address");
    });

    it("reverts when called by a non-owner", async function () {
      await expect(
        escrow.connect(other).updateShopAddress(other.address)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("sweeps to the updated shop address", async function () {
      await escrow
        .connect(borrower)
        .depositNFT(LOAN_ID, await nft.getAddress(), TOKEN_ID);
      await escrow.connect(owner).updateShopAddress(other.address);
      await escrow.connect(owner).sweepToShop(LOAN_ID);
      expect(await nft.ownerOf(TOKEN_ID)).to.equal(other.address);
    });
  });

  // ─── getLoan ─────────────────────────────────────────────────────────────

  describe("getLoan", function () {
    it("returns a zeroed struct for an unused loan ID", async function () {
      const loan = await escrow.getLoan(999n);
      expect(loan.borrower).to.equal(ethers.ZeroAddress);
      expect(loan.nftContract).to.equal(ethers.ZeroAddress);
      expect(loan.tokenId).to.equal(0n);
      expect(loan.status).to.equal(Status.Active);
    });

    it("returns the correct record after deposit", async function () {
      await escrow
        .connect(borrower)
        .depositNFT(LOAN_ID, await nft.getAddress(), TOKEN_ID);
      const loan = await escrow.getLoan(LOAN_ID);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.tokenId).to.equal(TOKEN_ID);
      expect(loan.status).to.equal(Status.Active);
    });
  });

  // ─── Multiple loans ──────────────────────────────────────────────────────

  describe("multiple loans", function () {
    it("handles independent loans for the same borrower", async function () {
      const LOAN_ID_2 = 99n;

      const TOKEN_ID_2 = await nft.connect(borrower).mint.staticCall(borrower.address);
      await nft.connect(borrower).mint(borrower.address);
      await nft.connect(borrower).approve(escrowAddress, TOKEN_ID_2);

      await escrow.connect(borrower).depositNFT(LOAN_ID, await nft.getAddress(), TOKEN_ID);
      await escrow.connect(borrower).depositNFT(LOAN_ID_2, await nft.getAddress(), TOKEN_ID_2);

      await escrow.connect(owner).releaseToOwner(LOAN_ID);
      await escrow.connect(owner).sweepToShop(LOAN_ID_2);

      expect(await nft.ownerOf(TOKEN_ID)).to.equal(borrower.address);
      expect(await nft.ownerOf(TOKEN_ID_2)).to.equal(shop.address);
    });
  });
});
