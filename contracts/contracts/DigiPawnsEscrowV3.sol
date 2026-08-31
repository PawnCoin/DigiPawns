// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @notice Upgrade candidate. Deployment is blocked until the live V1 layout is verified.
contract DigiPawnsEscrowV3 is
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    ERC721Holder,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    enum LoanStatus { Active, Released, Swept }
    enum Tier { NONE, STANDARD, GOLD }
    struct Loan {
        address borrower;
        address nftContract;
        uint256 tokenId;
        LoanStatus status;
        Tier tier;
    }

    // V1/V2 storage: never reorder, remove, or change these declarations.
    address public shopAddress;
    mapping(address => bool) public approvedCollections;
    mapping(uint256 => Loan) private _loans;
    mapping(address => bool) public blacklisted;
    mapping(uint256 => bool) public frozenLoans;
    address public digToken;
    address public pcEthToken;
    uint256 public digGoldThreshold;
    uint256 public pcGoldThreshold;
    address public rewardToken;
    uint256 public baseRewardAmount;
    uint256 public goldRewardMultiplier;
    mapping(bytes32 => bool) private _activeCollateral;

    // V3 append-only storage.
    struct Terms {
        address lender;
        address currency;
        address liquidationRecipient;
        uint128 principal;
        uint128 repayment;
        uint32 aprBps;
        uint64 dueAt;
        bytes32 appraisalHash;
        bool repaid;
        bool migrated;
    }
    mapping(uint256 => Terms) private _terms;
    mapping(bytes32 => bool) public usedOffers;
    address public offerSigner;
    uint256 public nextLoanId;
    bool public migrationComplete;
    bool public v3Enabled;
    uint256 public expectedLegacyLoans;
    uint256 public migratedLegacyLoans;

    bytes32 private constant OFFER_DOMAIN = keccak256("DigiPawnsEscrowV3.offer.v1");

    event NFTDeposited(uint256 indexed loanId,address indexed borrower,address indexed nftContract,uint256 tokenId,Tier tier);
    event NFTReleased(uint256 indexed loanId,address indexed borrower,address indexed nftContract,uint256 tokenId);
    event NFTSweptToShop(uint256 indexed loanId,address indexed shop,address indexed nftContract,uint256 tokenId);
    event LoanTermsRecorded(uint256 indexed loanId,address indexed lender,address currency,address liquidationRecipient,uint256 principal,uint256 repayment,uint32 aprBps,uint64 dueAt,bytes32 appraisalHash);
    event LoanRepaid(uint256 indexed loanId,address indexed borrower,address indexed lender,uint256 amount);
    event LegacyLoanMigrated(uint256 indexed loanId,address indexed nftContract,uint256 indexed tokenId);
    event MigrationCompleted();
    event OfferSignerUpdated(address indexed oldSigner,address indexed newSigner);
    event UntrackedNFTRescued(address indexed nftContract,uint256 indexed tokenId,address indexed recipient);

    struct Offer {
        address borrower;
        address nftContract;
        uint256 tokenId;
        address lender;
        address currency;
        address liquidationRecipient;
        uint128 principal;
        uint128 repayment;
        uint32 aprBps;
        uint64 dueAt;
        bytes32 appraisalHash;
        bytes32 salt;
    }

    struct LegacyMigration {
        uint256 loanId;
        address lender;
        address currency;
        address liquidationRecipient;
        uint128 principal;
        uint128 repayment;
        uint32 aprBps;
        uint64 dueAt;
        bytes32 appraisalHash;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address initialShop,address initialOwner) external initializer {
        require(initialShop != address(0) && initialOwner != address(0), "zero address");
        __Ownable_init(initialOwner);
        __Pausable_init();
        shopAddress = initialShop;
        goldRewardMultiplier = 150;
    }

    /// @notice Called atomically with the UUPS upgrade. Rescue stays locked.
    function initializeV3(address signer,uint256 firstNewLoanId,uint256 legacyLoanCount) external reinitializer(3) onlyOwner {
        require(signer != address(0), "zero signer");
        require(firstNewLoanId != 0, "zero loan id");
        offerSigner = signer;
        nextLoanId = firstNewLoanId;
        expectedLegacyLoans = legacyLoanCount;
        v3Enabled = true;
        if (!paused()) _pause();
    }

    function migrateLegacyLoans(LegacyMigration[] calldata entries) external onlyOwner whenPaused {
        require(v3Enabled && !migrationComplete, "migration closed");
        for (uint256 i; i < entries.length; ++i) {
            LegacyMigration calldata item = entries[i];
            Loan storage loan = _loans[item.loanId];
            require(loan.borrower != address(0) && loan.status == LoanStatus.Active, "not active");
            require(!_terms[item.loanId].migrated, "already migrated");
            require(item.lender != address(0) && item.currency != address(0), "bad lender/currency");
            require(item.liquidationRecipient != address(0), "bad liquidation recipient");
            require(item.repayment >= item.principal && item.dueAt != 0, "bad terms");
            require(IERC721(loan.nftContract).ownerOf(loan.tokenId) == address(this), "collateral absent");
            _activeCollateral[_collateralKey(loan.nftContract, loan.tokenId)] = true;
            _terms[item.loanId] = Terms(item.lender,item.currency,item.liquidationRecipient,item.principal,item.repayment,item.aprBps,item.dueAt,item.appraisalHash,false,true);
            ++migratedLegacyLoans;
            emit LegacyLoanMigrated(item.loanId, loan.nftContract, loan.tokenId);
        }
    }

    function completeMigration() external onlyOwner whenPaused {
        require(v3Enabled && !migrationComplete, "migration closed");
        require(migratedLegacyLoans == expectedLegacyLoans, "migration count mismatch");
        migrationComplete = true;
        emit MigrationCompleted();
    }

    function openLoan(
        Offer calldata offer,
        bytes calldata platformSignature,
        bytes calldata lenderSignature
    ) external nonReentrant whenNotPaused returns (uint256 loanId) {
        require(v3Enabled && migrationComplete, "v3 unavailable");
        require(msg.sender == offer.borrower && !blacklisted[msg.sender], "borrower blocked");
        require(approvedCollections[offer.nftContract], "collection not approved");
        require(offer.lender != address(0) && offer.currency != address(0), "bad lender/currency");
        require(offer.liquidationRecipient != address(0), "bad liquidation recipient");
        require(offer.principal > 0 && offer.repayment >= offer.principal, "bad terms");
        require(offer.dueAt > block.timestamp, "expired offer");
        _consumeSignedOffer(offer,platformSignature,lenderSignature);

        loanId = nextLoanId++;
        bytes32 key = _collateralKey(offer.nftContract, offer.tokenId);
        require(!_activeCollateral[key], "collateral active");
        IERC721(offer.nftContract).safeTransferFrom(msg.sender,address(this),offer.tokenId);
        _activeCollateral[key] = true;
        // Origination is atomic: collateral cannot be locked unless the borrower
        // receives the exact principal approved and signed by the lender.
        IERC20(offer.currency).safeTransferFrom(offer.lender,msg.sender,offer.principal);
        Tier tier = _computeTier(msg.sender);
        _loans[loanId] = Loan(msg.sender,offer.nftContract,offer.tokenId,LoanStatus.Active,tier);
        _terms[loanId] = Terms(offer.lender,offer.currency,offer.liquidationRecipient,offer.principal,offer.repayment,offer.aprBps,offer.dueAt,offer.appraisalHash,false,false);
        emit NFTDeposited(loanId,msg.sender,offer.nftContract,offer.tokenId,tier);
        _emitLoanTerms(loanId,offer);
    }

    function repayAndRelease(uint256 loanId) external nonReentrant whenNotPaused {
        Loan storage loan = _loans[loanId];
        Terms storage terms = _terms[loanId];
        require(msg.sender == loan.borrower && loan.status == LoanStatus.Active, "not borrower/active");
        require(!frozenLoans[loanId] && !terms.repaid, "blocked");
        terms.repaid = true;
        loan.status = LoanStatus.Released;
        _activeCollateral[_collateralKey(loan.nftContract,loan.tokenId)] = false;
        require(terms.currency != address(0), "unsupported legacy currency");
        IERC20(terms.currency).safeTransferFrom(msg.sender,terms.lender,terms.repayment);
        IERC721(loan.nftContract).safeTransferFrom(address(this),loan.borrower,loan.tokenId);
        emit LoanRepaid(loanId,loan.borrower,terms.lender,terms.repayment);
        emit NFTReleased(loanId,loan.borrower,loan.nftContract,loan.tokenId);
    }

    function liquidateDefault(uint256 loanId) external nonReentrant whenNotPaused {
        Loan storage loan = _loans[loanId];
        Terms storage terms = _terms[loanId];
        require(msg.sender == terms.lender, "not lender");
        require(loan.status == LoanStatus.Active && !terms.repaid, "not active");
        require(block.timestamp > terms.dueAt, "not due");
        require(!frozenLoans[loanId], "frozen");
        loan.status = LoanStatus.Swept;
        _activeCollateral[_collateralKey(loan.nftContract,loan.tokenId)] = false;
        IERC721(loan.nftContract).safeTransferFrom(address(this),terms.liquidationRecipient,loan.tokenId);
        emit NFTSweptToShop(loanId,terms.liquidationRecipient,loan.nftContract,loan.tokenId);
    }

    // Old unsafe entry points remain in the ABI but are permanently disabled after V3 activation.
    function depositNFT(uint256,address,uint256) external pure { revert("use openLoan"); }
    function releaseToOwner(uint256) external pure { revert("use repayAndRelease"); }
    function sweepToShop(uint256) external pure { revert("use liquidateDefault"); }

    function rescueUntrackedNFT(address nft,uint256 tokenId,address recipient) external onlyOwner nonReentrant whenPaused {
        require(migrationComplete, "migration incomplete");
        require(nft != address(0) && recipient != address(0), "zero address");
        require(!_activeCollateral[_collateralKey(nft,tokenId)], "active collateral");
        IERC721(nft).safeTransferFrom(address(this),recipient,tokenId);
        emit UntrackedNFTRescued(nft,tokenId,recipient);
    }

    function setOfferSigner(address signer) external onlyOwner {
        require(signer != address(0), "zero signer");
        emit OfferSignerUpdated(offerSigner,signer);
        offerSigner = signer;
    }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { require(migrationComplete, "migration incomplete"); _unpause(); }
    function approveCollection(address nft) external onlyOwner { require(nft != address(0), "zero address"); approvedCollections[nft] = true; }
    function revokeCollection(address nft) external onlyOwner { approvedCollections[nft] = false; }
    function freezeLoan(uint256 id) external onlyOwner { require(_loans[id].borrower != address(0), "not found"); frozenLoans[id] = true; }
    function unfreezeLoan(uint256 id) external onlyOwner { frozenLoans[id] = false; }
    function blacklist(address account) external onlyOwner { require(account != address(0), "zero address"); blacklisted[account] = true; }
    function unblacklist(address account) external onlyOwner { blacklisted[account] = false; }
    function updateShopAddress(address shop) external onlyOwner { require(shop != address(0), "zero address"); shopAddress = shop; }
    function setTokenTierConfig(address dig,uint256 digThreshold,address pc,uint256 pcThreshold) external onlyOwner {
        digToken=dig; digGoldThreshold=digThreshold; pcEthToken=pc; pcGoldThreshold=pcThreshold;
    }
    function setRewardConfig(address token,uint256 amount,uint256 multiplier) external onlyOwner {
        require(multiplier >= 100, "bad multiplier"); rewardToken=token; baseRewardAmount=amount; goldRewardMultiplier=multiplier;
    }
    function withdrawRewardPool(address to,uint256 amount) external onlyOwner { require(to != address(0), "zero address"); IERC20(rewardToken).safeTransfer(to,amount); }
    function getLoan(uint256 id) external view returns (Loan memory) { return _loans[id]; }
    function getTerms(uint256 id) external view returns (Terms memory) { return _terms[id]; }

    function _offerDigest(Offer calldata o) internal view returns (bytes32) {
        // The domain, chain and proxy bind a signed offer to this deployment and
        // prevent cross-chain/cross-contract replay. The ABI-encoded struct is
        // deterministic and is also straightforward for the backend to reproduce.
        return keccak256(abi.encode(OFFER_DOMAIN,keccak256(abi.encode(o)),block.chainid,address(this)));
    }
    function _consumeSignedOffer(Offer calldata offer,bytes calldata platformSignature,bytes calldata lenderSignature) internal {
        bytes32 digest = _offerDigest(offer);
        require(!usedOffers[digest], "offer used");
        bytes32 signedDigest = MessageHashUtils.toEthSignedMessageHash(digest);
        require(ECDSA.recover(signedDigest,platformSignature) == offerSigner, "bad platform signature");
        require(ECDSA.recover(signedDigest,lenderSignature) == offer.lender, "bad lender signature");
        usedOffers[digest] = true;
    }
    function _emitLoanTerms(uint256 loanId,Offer calldata offer) internal {
        emit LoanTermsRecorded(loanId,offer.lender,offer.currency,offer.liquidationRecipient,offer.principal,offer.repayment,offer.aprBps,offer.dueAt,offer.appraisalHash);
    }
    function _collateralKey(address nft,uint256 tokenId) internal pure returns (bytes32) { return keccak256(abi.encode(nft,tokenId)); }
    function _computeTier(address borrower) internal view returns (Tier) {
        uint256 digBal; uint256 pcBal;
        if (digToken != address(0)) { try IERC20(digToken).balanceOf(borrower) returns (uint256 b) { digBal=b; } catch {} }
        if (pcEthToken != address(0)) { try IERC20(pcEthToken).balanceOf(borrower) returns (uint256 b) { pcBal=b; } catch {} }
        if ((digGoldThreshold>0 && digBal>=digGoldThreshold)||(pcGoldThreshold>0 && pcBal>=pcGoldThreshold)) return Tier.GOLD;
        if (digBal>0 || pcBal>0) return Tier.STANDARD;
        return Tier.NONE;
    }
    function _authorizeUpgrade(address) internal override onlyOwner {}
}

