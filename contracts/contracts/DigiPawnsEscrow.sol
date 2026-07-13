// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DigiPawnsEscrow
 * @notice Holds ERC-721 NFTs as collateral for DigiPawns loans.
 *
 * Flow:
 *   1. Borrower approves this contract on the NFT, then calls depositNFT().
 *   2. On repayment  → owner (DigiPawns operator) calls releaseToOwner().
 *   3. On default    → owner calls sweepToShop(); NFT goes to the shop wallet.
 *
 * Access control:
 *   - depositNFT: any caller who owns (and has approved) the NFT.
 *   - releaseToOwner / sweepToShop / updateShopAddress: only the contract owner
 *     (the DigiPawns admin wallet set at deployment time).
 */
contract DigiPawnsEscrow is Ownable, ReentrancyGuard {
    // ─── Types ───────────────────────────────────────────────────────────────

    enum LoanStatus {
        Active,   // NFT held in escrow, loan open
        Released, // NFT returned to borrower on repayment
        Swept     // NFT sent to shop on default
    }

    struct Loan {
        address borrower;
        address nftContract;
        uint256 tokenId;
        LoanStatus status;
    }

    // ─── State ───────────────────────────────────────────────────────────────

    /// @notice Wallet that receives NFTs when a loan is swept (defaulted).
    address public shopAddress;

    /// @notice loanId → Loan record.
    mapping(uint256 => Loan) private _loans;

    // ─── Events ──────────────────────────────────────────────────────────────

    event NFTDeposited(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed nftContract,
        uint256 tokenId
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

    event ShopAddressUpdated(address indexed oldShop, address indexed newShop);

    // ─── Constructor ─────────────────────────────────────────────────────────

    /**
     * @param _shopAddress Wallet that receives defaulted collateral.
     *                     Typically a multisig or cold wallet controlled by DigiPawns.
     */
    constructor(address _shopAddress) Ownable(msg.sender) {
        require(_shopAddress != address(0), "Escrow: zero shop address");
        shopAddress = _shopAddress;
    }

    // ─── Borrower actions ────────────────────────────────────────────────────

    /**
     * @notice Deposit an NFT into escrow to open a loan.
     * @dev    The caller must have called nftContract.approve(escrowAddress, tokenId)
     *         (or setApprovalForAll) before calling this function.
     * @param loanId      Unique identifier for this loan (generated off-chain by DigiPawns).
     * @param nftContract ERC-721 contract address of the collateral NFT.
     * @param tokenId     Token ID of the collateral NFT.
     */
    function depositNFT(
        uint256 loanId,
        address nftContract,
        uint256 tokenId
    ) external nonReentrant {
        require(_loans[loanId].borrower == address(0), "Escrow: loan ID already used");
        require(nftContract != address(0), "Escrow: zero NFT contract");

        // Pull the NFT into escrow (reverts if not approved or not owner).
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        _loans[loanId] = Loan({
            borrower: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            status: LoanStatus.Active
        });

        emit NFTDeposited(loanId, msg.sender, nftContract, tokenId);
    }

    // ─── Operator actions (onlyOwner) ────────────────────────────────────────

    /**
     * @notice Release the escrowed NFT back to the borrower on loan repayment.
     * @param loanId Loan to settle.
     */
    function releaseToOwner(uint256 loanId) external onlyOwner nonReentrant {
        Loan storage loan = _loans[loanId];
        require(loan.borrower != address(0), "Escrow: loan not found");
        require(loan.status == LoanStatus.Active, "Escrow: loan not active");

        loan.status = LoanStatus.Released;

        IERC721(loan.nftContract).transferFrom(
            address(this),
            loan.borrower,
            loan.tokenId
        );

        emit NFTReleased(loanId, loan.borrower, loan.nftContract, loan.tokenId);
    }

    /**
     * @notice Sweep the escrowed NFT to the shop wallet on loan default.
     * @param loanId Loan to liquidate.
     */
    function sweepToShop(uint256 loanId) external onlyOwner nonReentrant {
        Loan storage loan = _loans[loanId];
        require(loan.borrower != address(0), "Escrow: loan not found");
        require(loan.status == LoanStatus.Active, "Escrow: loan not active");

        loan.status = LoanStatus.Swept;

        IERC721(loan.nftContract).transferFrom(
            address(this),
            shopAddress,
            loan.tokenId
        );

        emit NFTSweptToShop(loanId, shopAddress, loan.nftContract, loan.tokenId);
    }

    /**
     * @notice Update the shop wallet address (e.g. after a key rotation).
     * @param newShopAddress New shop wallet; must be non-zero.
     */
    function updateShopAddress(address newShopAddress) external onlyOwner {
        require(newShopAddress != address(0), "Escrow: zero shop address");
        address old = shopAddress;
        shopAddress = newShopAddress;
        emit ShopAddressUpdated(old, newShopAddress);
    }

    // ─── View ────────────────────────────────────────────────────────────────

    /**
     * @notice Return the full Loan record for a given loanId.
     * @dev    borrower == address(0) means the loanId has never been used.
     */
    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return _loans[loanId];
    }
}
