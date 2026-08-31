const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DigiPawnsEscrowV3", function () {
  async function fixture() {
    const [owner, shop, platform, lender, borrower, attacker] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("DigiPawnsEscrowV3");
    const implementation = await Escrow.deploy();
    const Proxy = await ethers.getContractFactory("TestERC1967Proxy");
    const init = Escrow.interface.encodeFunctionData("initialize", [shop.address, owner.address]);
    const proxy = await Proxy.deploy(await implementation.getAddress(), init);
    const escrow = Escrow.attach(await proxy.getAddress());
    await escrow.initializeV3(platform.address, 1000, 0);

    const Token = await ethers.getContractFactory("MockERC20V3");
    const token = await Token.deploy();
    const NFT = await ethers.getContractFactory("MockERC721V3");
    const nft = await NFT.deploy();
    await escrow.approveCollection(await nft.getAddress());
    await escrow.completeMigration();
    await escrow.unpause();
    return { owner, shop, platform, lender, borrower, attacker, escrow, token, nft };
  }

  async function signedOffer(ctx, tokenId, overrides = {}) {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const offer = {
      borrower: ctx.borrower.address,
      nftContract: await ctx.nft.getAddress(),
      tokenId,
      lender: ctx.lender.address,
      currency: await ctx.token.getAddress(),
      liquidationRecipient: ctx.shop.address,
      principal: 100n,
      repayment: 110n,
      aprBps: 1200,
      dueAt: now + 3600,
      appraisalHash: ethers.keccak256(ethers.toUtf8Bytes("appraisal-v1")),
      salt: ethers.randomBytes(32),
      ...overrides,
    };
    const coder = ethers.AbiCoder.defaultAbiCoder();
    const tuple = "tuple(address borrower,address nftContract,uint256 tokenId,address lender,address currency,address liquidationRecipient,uint128 principal,uint128 repayment,uint32 aprBps,uint64 dueAt,bytes32 appraisalHash,bytes32 salt)";
    const offerHash = ethers.keccak256(coder.encode([tuple], [offer]));
    const domain = ethers.keccak256(ethers.toUtf8Bytes("DigiPawnsEscrowV3.offer.v1"));
    const network = await ethers.provider.getNetwork();
    const digest = ethers.keccak256(coder.encode(
      ["bytes32", "bytes32", "uint256", "address"],
      [domain, offerHash, network.chainId, await ctx.escrow.getAddress()]
    ));
    return {
      offer,
      platformSignature: await ctx.platform.signMessage(ethers.getBytes(digest)),
      lenderSignature: await ctx.lender.signMessage(ethers.getBytes(digest)),
    };
  }

  async function originate(ctx, tokenId = 1) {
    await ctx.nft.mint(ctx.borrower.address, tokenId);
    await ctx.nft.connect(ctx.borrower).approve(await ctx.escrow.getAddress(), tokenId);
    await ctx.token.mint(ctx.lender.address, 1000);
    await ctx.token.connect(ctx.lender).approve(await ctx.escrow.getAddress(), 1000);
    const signed = await signedOffer(ctx, tokenId);
    await ctx.escrow.connect(ctx.borrower).openLoan(signed.offer, signed.platformSignature, signed.lenderSignature);
    return signed;
  }

  it("atomically funds the borrower and locks collateral", async function () {
    const ctx = await fixture();
    await originate(ctx);
    expect(await ctx.token.balanceOf(ctx.borrower.address)).to.equal(100);
    expect(await ctx.nft.ownerOf(1)).to.equal(await ctx.escrow.getAddress());
    expect((await ctx.escrow.getLoan(1000)).borrower).to.equal(ctx.borrower.address);
  });

  it("requires verified full repayment before releasing the NFT", async function () {
    const ctx = await fixture();
    await originate(ctx);
    await ctx.token.mint(ctx.borrower.address, 10);
    await ctx.token.connect(ctx.borrower).approve(await ctx.escrow.getAddress(), 110);
    await ctx.escrow.connect(ctx.borrower).repayAndRelease(1000);
    expect(await ctx.token.balanceOf(ctx.lender.address)).to.equal(1010);
    expect(await ctx.nft.ownerOf(1)).to.equal(ctx.borrower.address);
  });

  it("rejects early liquidation and permits lender liquidation after default", async function () {
    const ctx = await fixture();
    await originate(ctx);
    await expect(ctx.escrow.connect(ctx.lender).liquidateDefault(1000)).to.be.revertedWith("not due");
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await ctx.escrow.connect(ctx.lender).liquidateDefault(1000);
    expect(await ctx.nft.ownerOf(1)).to.equal(ctx.shop.address);
  });

  it("rejects replayed offers and signatures from the wrong lender", async function () {
    const ctx = await fixture();
    const signed = await originate(ctx);
    await expect(ctx.escrow.connect(ctx.borrower).openLoan(signed.offer, signed.platformSignature, signed.lenderSignature)).to.be.revertedWith("offer used");
    const second = await signedOffer(ctx, 2);
    const badSignature = await ctx.attacker.signMessage(ethers.getBytes(ethers.keccak256("0x1234")));
    await expect(ctx.escrow.connect(ctx.borrower).openLoan(second.offer, second.platformSignature, badSignature)).to.be.reverted;
  });

  it("keeps rescue locked until legacy migration is explicitly completed", async function () {
    const [owner, shop, platform, recipient] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("DigiPawnsEscrowV3");
    const implementation = await Escrow.deploy();
    const Proxy = await ethers.getContractFactory("TestERC1967Proxy");
    const init = Escrow.interface.encodeFunctionData("initialize", [shop.address, owner.address]);
    const proxy = await Proxy.deploy(await implementation.getAddress(), init);
    const escrow = Escrow.attach(await proxy.getAddress());
    const NFT = await ethers.getContractFactory("MockERC721V3");
    const nft = await NFT.deploy();
    await nft.mint(owner.address, 44);
    await nft.transferFrom(owner.address, await escrow.getAddress(), 44);
    await escrow.pause();
    await escrow.initializeV3(platform.address, 1000, 0);
    await expect(escrow.rescueUntrackedNFT(await nft.getAddress(), 44, recipient.address)).to.be.revertedWith("migration incomplete");
    await escrow.completeMigration();
    await escrow.rescueUntrackedNFT(await nft.getAddress(), 44, recipient.address);
    expect(await nft.ownerOf(44)).to.equal(recipient.address);
  });

  it("never lets the owner rescue active collateral", async function () {
    const ctx = await fixture();
    await originate(ctx);
    await ctx.escrow.pause();
    await expect(
      ctx.escrow.rescueUntrackedNFT(await ctx.nft.getAddress(), 1, ctx.owner.address)
    ).to.be.revertedWith("active collateral");
    expect(await ctx.nft.ownerOf(1)).to.equal(await ctx.escrow.getAddress());
  });

  it("prevents non-lenders and the owner from liquidating collateral", async function () {
    const ctx = await fixture();
    await originate(ctx);
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await expect(ctx.escrow.connect(ctx.attacker).liquidateDefault(1000)).to.be.revertedWith("not lender");
    await expect(ctx.escrow.connect(ctx.owner).liquidateDefault(1000)).to.be.revertedWith("not lender");
    expect(await ctx.nft.ownerOf(1)).to.equal(await ctx.escrow.getAddress());
  });

  it("honors a loan freeze for repayment and liquidation", async function () {
    const ctx = await fixture();
    await originate(ctx);
    await ctx.escrow.freezeLoan(1000);
    await ctx.token.mint(ctx.borrower.address, 10);
    await ctx.token.connect(ctx.borrower).approve(await ctx.escrow.getAddress(), 110);
    await expect(ctx.escrow.connect(ctx.borrower).repayAndRelease(1000)).to.be.revertedWith("blocked");
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await expect(ctx.escrow.connect(ctx.lender).liquidateDefault(1000)).to.be.revertedWith("frozen");
  });

  it("keeps the signed liquidation recipient immutable", async function () {
    const ctx = await fixture();
    await originate(ctx);
    await ctx.escrow.updateShopAddress(ctx.attacker.address);
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await ctx.escrow.connect(ctx.lender).liquidateDefault(1000);
    expect(await ctx.nft.ownerOf(1)).to.equal(ctx.shop.address);
  });

  it("cannot complete migration until the declared legacy-loan count is met", async function () {
    const [owner, shop, platform] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("DigiPawnsEscrowV3");
    const implementation = await Escrow.deploy();
    const Proxy = await ethers.getContractFactory("TestERC1967Proxy");
    const init = Escrow.interface.encodeFunctionData("initialize", [shop.address, owner.address]);
    const proxy = await Proxy.deploy(await implementation.getAddress(), init);
    const escrow = Escrow.attach(await proxy.getAddress());
    await escrow.initializeV3(platform.address, 1000, 1);
    await expect(escrow.completeMigration()).to.be.revertedWith("migration count mismatch");
  });

  it("upgrades a paused V2 proxy, migrates active collateral, and safely repays", async function () {
    const [owner, shop, platform, lender, borrower] = await ethers.getSigners();
    const V2 = await ethers.getContractFactory("DigiPawnsEscrow");
    const v2Implementation = await V2.deploy();
    const Proxy = await ethers.getContractFactory("TestERC1967Proxy");
    const init = V2.interface.encodeFunctionData("initialize", [shop.address, owner.address]);
    const proxy = await Proxy.deploy(await v2Implementation.getAddress(), init);
    const v2 = V2.attach(await proxy.getAddress());

    const NFT = await ethers.getContractFactory("MockNFT");
    const nft = await NFT.deploy();
    await v2.approveCollection(await nft.getAddress());
    const tokenId = await nft.connect(borrower).mint.staticCall(borrower.address);
    await nft.connect(borrower).mint(borrower.address);
    await nft.connect(borrower).approve(await proxy.getAddress(), tokenId);
    await v2.connect(borrower).depositNFT(77, await nft.getAddress(), tokenId);
    await v2.pause();

    const Token = await ethers.getContractFactory("MockERC20V3");
    const token = await Token.deploy();
    const V3 = await ethers.getContractFactory("DigiPawnsEscrowV3");
    const v3Implementation = await V3.deploy();
    const initV3 = V3.interface.encodeFunctionData("initializeV3", [platform.address, 1000, 1]);
    await v2.upgradeToAndCall(await v3Implementation.getAddress(), initV3);
    const v3 = V3.attach(await proxy.getAddress());

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await v3.migrateLegacyLoans([{
      loanId: 77,
      lender: lender.address,
      currency: await token.getAddress(),
      liquidationRecipient: shop.address,
      principal: 100,
      repayment: 110,
      aprBps: 1200,
      dueAt: now + 3600,
      appraisalHash: ethers.ZeroHash,
    }]);
    await v3.completeMigration();
    await v3.unpause();
    await token.mint(borrower.address, 110);
    await token.connect(borrower).approve(await proxy.getAddress(), 110);
    await v3.connect(borrower).repayAndRelease(77);

    expect(await nft.ownerOf(tokenId)).to.equal(borrower.address);
    expect(await token.balanceOf(lender.address)).to.equal(110);
    expect((await v3.getTerms(77)).repaid).to.equal(true);
  });
});
