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

/**
 * @title  DigiPawnsEscrow v2
 * @notice Production-grade NFT escrow for DigiPawns loans.
 *
 * ── Core flow ────────────────────────────────────────────────────────────────
 *  1. Owner whitelists an NFT collection via approveCollection().
 *  2. Borrower approves this contract on the NFT, then calls depositNFT().
 *     The borrower's $DIG / $PC balance is read on-chain and their tier
 *     (GOLD / STANDARD / NONE) is permanently stored in the loan record.
 *  3. On repayment  → owner calls releaseToOwner(); NFT returns to borrower
 *                     and a tier-based reward is automatically sent if funded.
 *  4. On default    → owner calls sweepToShop(); NFT goes to the shop wallet.
 *
 * ── Admin controls ───────────────────────────────────────────────────────────
 *  • Global pause    — pause() / unpause() halts all state-changing operations.
 *  • Wallet blacklist — blacklist() / unblacklist() blocks an address entirely.
 *  • Loan freeze     — freezeLoan() / unfreezeLoan() locks one loan for
 *                      investigation; prevents release AND sweep until unfrozen.
 *  • Upgradeability  — UUPS proxy; owner calls upgradeTo() to push new logic
 *                      without changing the contract address or losing data.
 *
 * ── Reward system ────────────────────────────────────────────────────────────
 *  Admin sets rewardToken, baseRewardAmount, and goldRewardMultiplier.
 *  On successful repayment:
 *    GOLD tier     → baseRewardAmount × goldRewardMultiplier / 100
 *    STANDARD tier → baseRewardAmount
 *    NONE tier     → 0
 *  Rewards only pay out if the contract holds enough reward tokens.
 *  Admin funds the pool by transferring reward tokens to this contract address.
 */
contract DigiPawnsEscrow is
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    ERC721Holder,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    // ─── Types ───────────────────────────────────────────────────────────────

    enum LoanStatus { Active, Released, Swept }

    /// @notice Borrower's DigiPawns token tier, recorded at deposit time.
    enum Tier { NONE, STANDARD, GOLD }

    struct Loan {
        address  borrower;
        address  nftContract;
        uint256  tokenId;
        LoanStatus status;
        Tier     tier;
    }

    // ─── State ───────────────────────────────────────────────────────────────

    /// @notice Wallet that receives NFTs on default (sweep).
    address public shopAddress;

    /// @notice NFT collections accepted as collateral.
    mapping(address => bool) public approvedCollections;

    /// @notice loanId → Loan record.
    mapping(uint256 => Loan) private _loans;

    // ── Security controls ────────────────────────────────────────────────────

    /// @notice Addresses permanently blocked from interacting with the contract.
    mapping(address => bool) public blacklisted;

    /// @notice Loans locked during an investigation — cannot be released or swept.
    mapping(uint256 => bool) public frozenLoans;

    // ── Token tier detection ─────────────────────────────────────────────────

    /// @notice $DIG ERC-20 contract address (set after deploy).
    address public digToken;

    /// @notice $PC ERC-20 contract address on Ethereum/Base (set after deploy).
    address public pcEthToken;

    /// @notice Minimum $DIG balance (in wei) required for GOLD tier.
    uint256 public digGoldThreshold;

    /// @notice Minimum $PC balance (in wei) required for GOLD tier.
    uint256 public pcGoldThreshold;

    // ── Reward system ────────────────────────────────────────────────────────

    /// @notice ERC-20 token paid as a reward on successful repayment.
    address public rewardToken;

    /// @notice Base reward for STANDARD-tier borrowers (in reward token decimals).
    uint256 public baseRewardAmount;

    /**
     * @notice Multiplier applied to baseRewardAmount for GOLD-tier borrowers.
     *         Expressed as a percentage integer: 150 = 1.5× (50 % bonus).
     *         Default: 150.
     */
    uint256 public goldRewardMultiplier;

    /// @dev Tracks collateral held through a valid active loan. Appended for upgrade-safe storage.
    mapping(bytes32 => bool) private _activeCollateral;

    // ─── Events ──────────────────────────────────────────────────────────────

    // Core loan lifecycle
    event NFTDeposited(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed nftContract,
        uint256 tokenId,
        Tier    tier
    );
    event NFTReleased(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed nftContract,
        uint256 tokenId
    );
    event NFTSweptToShop(
        uint256 indexed loanId,
        address indexed shop,
        address indexed nftContract,
        uint256 tokenId
    );

    // Rewards
    event RewardPaid(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed token,
        uint256 amount
    );
    event RewardPoolInsufficient(uint256 loanId, uint256 needed, uint256 available);
    event UntrackedNFTRescued(address indexed nftContract, uint256 indexed tokenId, address indexed recipient);

    // Admin config changes
    event ShopAddressUpdated(address indexed oldShop,  address indexed newShop);
    event CollectionApproved(address indexed nftContract);
    event CollectionRevoked (address indexed nftContract);
    event AddressBlacklisted  (address indexed account);
    event AddressUnblacklisted(address indexed account);
    event LoanFrozen  (uint256 indexed loanId);
    event LoanUnfrozen(uint256 indexed loanId);
    event TokenTierConfigUpdated(
        address digToken, uint256 digGoldThreshold,
        address pcEthToken, uint256 pcGoldThreshold
    );
    event RewardConfigUpdated(
        address rewardToken,
        uint256 baseRewardAmount,
        uint256 goldRewardMultiplier
    );

    // ─── Initializer (replaces constructor for upgradeable contracts) ─────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    /**
     * @notice One-time setup called immediately after proxy deployment.
     * @param _shopAddress    Wallet that receives defaulted collateral.
     * @param _initialOwner   Admin wallet (becomes the contract owner).
     */
    function initialize(address _shopAddress, address _initialOwner) external initializer {
        require(_shopAddress   != address(0), "Escrow: zero shop address");
        require(_initialOwner  != address(0), "Escrow: zero owner");

        __Ownable_init(_initialOwner);
        __Pausable_init();
        // UUPSUpgradeable, ReentrancyGuard, ERC721Holder are @custom:stateless
        // in OZ v5 — no init calls needed for proxy compatibility.

        shopAddress          = _shopAddress;
        goldRewardMultiplier = 150; // 1.5× default
    }

    // ─── UUPS upgrade gate ────────────────────────────────────────────────────

    /// @dev Only the owner can push a new implementation.
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ─── Global pause ─────────────────────────────────────────────────────────

    /// @notice Halt all deposits, releases, and sweeps immediately.
    function pause() external onlyOwner   { _pause(); }

    /// @notice Resume normal operations.
    function unpause() external onlyOwner { _unpause(); }

    // ─── Wallet blacklist ─────────────────────────────────────────────────────

    /**
     * @notice Permanently block a wallet from depositing NFTs or receiving them.
     * @dev    Frozen/active loans on a blacklisted address can still be swept
     *         to the shop — admin recovery must never be blocked.
     */
    function blacklist(address account) external onlyOwner {
        require(account != address(0), "Escrow: zero address");
        blacklisted[account] = true;
        emit AddressBlacklisted(account);
    }

    /// @notice Remove a wallet from the blacklist.
    function unblacklist(address account) external onlyOwner {
        blacklisted[account] = false;
        emit AddressUnblacklisted(account);
    }

    // ─── Loan freeze ──────────────────────────────────────────────────────────

    /**
     * @notice Lock a specific loan during an investigation.
     *         Neither release nor sweep is possible until unfrozen.
     */
    function freezeLoan(uint256 loanId) external onlyOwner {
        require(_loans[loanId].borrower != address(0), "Escrow: loan not found");
        frozenLoans[loanId] = true;
        emit LoanFrozen(loanId);
    }

    /// @notice Unlock a frozen loan so it can be released or swept.
    function unfreezeLoan(uint256 loanId) external onlyOwner {
        frozenLoans[loanId] = false;
        emit LoanUnfrozen(loanId);
    }

    // ─── Collection allowlist ─────────────────────────────────────────────────

    function approveCollection(address nftContract) external onlyOwner {
        require(nftContract != address(0), "Escrow: zero address");
        approvedCollections[nftContract] = true;
        emit CollectionApproved(nftContract);
    }

    function revokeCollection(address nftContract) external onlyOwner {
        approvedCollections[nftContract] = false;
        emit CollectionRevoked(nftContract);
    }

    // ─── Token tier config ────────────────────────────────────────────────────

    /**
     * @notice Set the $DIG and $PC token addresses and GOLD-tier thresholds.
     * @param _digToken          $DIG ERC-20 contract address.
     * @param _digGoldThreshold  Min $DIG balance (wei) for GOLD tier (0 = disabled).
     * @param _pcEthToken        $PC ERC-20 contract address.
     * @param _pcGoldThreshold   Min $PC balance (wei) for GOLD tier (0 = disabled).
     */
    function setTokenTierConfig(
        address _digToken,
        uint256 _digGoldThreshold,
        address _pcEthToken,
        uint256 _pcGoldThreshold
    ) external onlyOwner {
        digToken          = _digToken;
        digGoldThreshold  = _digGoldThreshold;
        pcEthToken        = _pcEthToken;
        pcGoldThreshold   = _pcGoldThreshold;
        emit TokenTierConfigUpdated(_digToken, _digGoldThreshold, _pcEthToken, _pcGoldThreshold);
    }

    // ─── Reward config ────────────────────────────────────────────────────────

    /**
     * @notice Configure the on-repayment reward system.
     * @param _rewardToken          ERC-20 token to pay as reward ($DIG or $PC).
     *                              Set to address(0) to disable rewards entirely.
     * @param _baseRewardAmount     Tokens paid to STANDARD-tier borrowers (in
     *                              reward token's smallest unit / wei).
     * @param _goldRewardMultiplier Multiplier for GOLD tier as a percentage
     *                              integer (e.g. 150 = 1.5×). Must be >= 100.
     */
    function setRewardConfig(
        address _rewardToken,
        uint256 _baseRewardAmount,
        uint256 _goldRewardMultiplier
    ) external onlyOwner {
        require(_goldRewardMultiplier >= 100, "Escrow: multiplier must be >= 100");
        rewardToken          = _rewardToken;
        baseRewardAmount     = _baseRewardAmount;
        goldRewardMultiplier = _goldRewardMultiplier;
        emit RewardConfigUpdated(_rewardToken, _baseRewardAmount, _goldRewardMultiplier);
    }

    /**
     * @notice Withdraw reward tokens from the contract pool.
     *         Use to top up (transfer in directly) or drain (call this).
     */
    function withdrawRewardPool(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Escrow: zero address");
        require(rewardToken != address(0), "Escrow: no reward token set");
        IERC20(rewardToken).safeTransfer(to, amount);
    }

    // ─── Shop address ─────────────────────────────────────────────────────────

    function updateShopAddress(address newShopAddress) external onlyOwner {
        require(newShopAddress != address(0), "Escrow: zero shop address");
        address old = shopAddress;
        shopAddress = newShopAddress;
        emit ShopAddressUpdated(old, newShopAddress);
    }

    // ─── Borrower actions ─────────────────────────────────────────────────────

    /**
     * @notice Deposit an NFT into escrow to open a loan.
     *
     * @dev  Pre-conditions:
     *       1. Contract is not paused.
     *       2. Caller is not blacklisted.
     *       3. nftContract is on the approved-collection allowlist.
     *       4. Caller has called nftContract.approve(escrowAddress, tokenId) first.
     *
     *       The caller's $DIG and $PC balances are read on-chain to determine tier:
     *         GOLD     — holds ≥ digGoldThreshold $DIG  OR  ≥ pcGoldThreshold $PC
     *         STANDARD — holds any $DIG or $PC (below GOLD threshold)
     *         NONE     — holds neither token
     *       Tier is permanently stored and affects the repayment reward.
     */
    function depositNFT(
        uint256 loanId,
        address nftContract,
        uint256 tokenId
    ) external nonReentrant whenNotPaused {
        require(!blacklisted[msg.sender],               "Escrow: address blacklisted");
        require(_loans[loanId].borrower == address(0),  "Escrow: loan ID already used");
        require(nftContract != address(0),              "Escrow: zero NFT contract");
        require(approvedCollections[nftContract],       "Escrow: collection not approved");

        // ── Tier detection ───────────────────────────────────────────────────
        Tier tier = _computeTier(msg.sender);

        // ── Transfer NFT into escrow ─────────────────────────────────────────
        bytes32 collateralKey = _collateralKey(nftContract, tokenId);
        require(!_activeCollateral[collateralKey], "Escrow: collateral already active");
        IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenId);

        _loans[loanId] = Loan({
            borrower:    msg.sender,
            nftContract: nftContract,
            tokenId:     tokenId,
            status:      LoanStatus.Active,
            tier:        tier
        });

        emit NFTDeposited(loanId, msg.sender, nftContract, tokenId, tier);
    }

    // ─── Operator actions (onlyOwner) ─────────────────────────────────────────

    /**
     * @notice Release the escrowed NFT back to the borrower on repayment.
     *         Automatically pays a tier-based reward if the pool is funded.
     */
    function releaseToOwner(uint256 loanId) external onlyOwner nonReentrant whenNotPaused {
        Loan storage loan = _loans[loanId];
        require(loan.borrower != address(0),         "Escrow: loan not found");
        require(loan.status == LoanStatus.Active,    "Escrow: loan not active");
        require(!frozenLoans[loanId],                "Escrow: loan is frozen");

        loan.status = LoanStatus.Released;

        // Return NFT
        _activeCollateral[_collateralKey(loan.nftContract, loan.tokenId)] = false;
        IERC721(loan.nftContract).safeTransferFrom(address(this), loan.borrower, loan.tokenId);
        emit NFTReleased(loanId, loan.borrower, loan.nftContract, loan.tokenId);

        // Pay tier-based reward (if configured and pool is funded)
        _payReward(loanId, loan.borrower, loan.tier);
    }

    /**
     * @notice Sweep the escrowed NFT to the shop wallet on loan default.
     * @dev    Blacklisted borrowers' NFTs can still be swept — admin recovery
     *         must always be possible regardless of blacklist status.
     */
    function sweepToShop(uint256 loanId) external onlyOwner nonReentrant whenNotPaused {
        Loan storage loan = _loans[loanId];
        require(loan.borrower != address(0),         "Escrow: loan not found");
        require(loan.status == LoanStatus.Active,    "Escrow: loan not active");
        require(!frozenLoans[loanId],                "Escrow: loan is frozen");

        loan.status = LoanStatus.Swept;
        _activeCollateral[_collateralKey(loan.nftContract, loan.tokenId)] = false;
        IERC721(loan.nftContract).safeTransferFrom(address(this), shopAddress, loan.tokenId);
        emit NFTSweptToShop(loanId, shopAddress, loan.nftContract, loan.tokenId);
    }

    /**
     * @notice Recover an NFT sent directly to the contract outside depositNFT().
     * @dev Active loan collateral can never be rescued through this function.
     * Recovery is restricted to the owner while the protocol is paused.
     */
    function rescueUntrackedNFT(
        address nftContract,
        uint256 tokenId,
        address recipient
    ) external onlyOwner nonReentrant whenPaused {
        require(nftContract != address(0), "Escrow: zero NFT contract");
        require(recipient != address(0), "Escrow: zero recipient");
        require(
            !_activeCollateral[_collateralKey(nftContract, tokenId)],
            "Escrow: active collateral"
        );

        IERC721(nftContract).safeTransferFrom(address(this), recipient, tokenId);
        emit UntrackedNFTRescued(nftContract, tokenId, recipient);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    function _collateralKey(address nftContract, uint256 tokenId) internal pure returns (bytes32) {
        return keccak256(abi.encode(nftContract, tokenId));
    }

    /**
     * @dev  Compute the borrower tier from their live $DIG and $PC balances.
     *       Returns NONE when token addresses are not configured.
     */
    function _computeTier(address borrower) internal view returns (Tier) {
        uint256 digBal;
        uint256 pcBal;

        if (digToken != address(0)) {
            try IERC20(digToken).balanceOf(borrower) returns (uint256 bal) {
                digBal = bal;
            } catch {}
        }
        if (pcEthToken != address(0)) {
            try IERC20(pcEthToken).balanceOf(borrower) returns (uint256 bal) {
                pcBal = bal;
            } catch {}
        }

        // GOLD: meets at least one configured threshold
        bool goldDig = digToken != address(0) && digGoldThreshold > 0 && digBal >= digGoldThreshold;
        bool goldPc  = pcEthToken != address(0) && pcGoldThreshold > 0 && pcBal  >= pcGoldThreshold;
        if (goldDig || goldPc) return Tier.GOLD;

        // STANDARD: holds any platform token
        if (digBal > 0 || pcBal > 0) return Tier.STANDARD;

        return Tier.NONE;
    }

    /**
     * @dev  Transfer a tier-appropriate reward to the borrower.
     *       Silently skips (emits event) if:
     *         - rewardToken is not configured
     *         - tier is NONE
     *         - pool balance is insufficient
     */
    function _payReward(uint256 loanId, address borrower, Tier tier) internal {
        if (rewardToken == address(0) || baseRewardAmount == 0) return;
        if (tier == Tier.NONE) return;

        uint256 amount = (tier == Tier.GOLD)
            ? (baseRewardAmount * goldRewardMultiplier) / 100
            : baseRewardAmount;

        uint256 poolBalance = IERC20(rewardToken).balanceOf(address(this));
        if (poolBalance < amount) {
            emit RewardPoolInsufficient(loanId, amount, poolBalance);
            return;
        }

        IERC20(rewardToken).safeTransfer(borrower, amount);
        emit RewardPaid(loanId, borrower, rewardToken, amount);
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    /// @notice Return the full Loan record for a given loanId.
    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return _loans[loanId];
    }

    /**
     * @notice Preview the reward a borrower would receive on repayment.
     * @return token  The reward token address (address(0) if none configured).
     * @return amount The reward amount in the token's smallest unit.
     */
    function previewReward(uint256 loanId) external view returns (address token, uint256 amount) {
        Loan memory loan = _loans[loanId];
        if (loan.borrower == address(0) || rewardToken == address(0) || baseRewardAmount == 0) {
            return (address(0), 0);
        }
        if (loan.tier == Tier.NONE) return (address(0), 0);

        uint256 amt = (loan.tier == Tier.GOLD)
            ? (baseRewardAmount * goldRewardMultiplier) / 100
            : baseRewardAmount;

        return (rewardToken, amt);
    }

    /**
     * @notice Check the current tier a given address would receive if they
     *         deposited right now (based on their live token balances).
     */
    function getTierForAddress(address account) external view returns (Tier) {
        return _computeTier(account);
    }
}
