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
 *   1. Owner adds the NFT's contract to the approved-collection allowlist.
 *   2. Borrower approves this contract on the NFT, then calls depositNFT().
 *   3. On repayment  → owner calls releaseToOwner(); NFT returns to borrower.
 *   4. On default    → owner calls sweepToShop(); NFT goes to the shop wallet.
 *
 * Access control:
 *   - depositNFT: any caller who owns (and has approved) an allowlisted NFT.
 *   - All other mutating functions: contract owner (DigiPawns admin wallet).
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

    /// @notice NFT contracts that are accepted as collateral.
    mapping(address => bool) public approvedCollections;

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

    event CollectionApproved(address indexed nftContract);
    event CollectionRevoked(address indexed nftContract);

    // ─── Constructor ─────────────────────────────────────────────────────────

    /**
     * @param _shopAddress Wallet that receives defaulted collateral.
     */
    constructor(address _shopAddress) Ownable(msg.sender) {
        require(_shopAddress != address(0), "Escrow: zero shop address");
        shopAddress = _shopAddress;
    }

    // ─── Collection allowlist ─────────────────────────────────────────────────

    /**
     * @notice Approve an NFT contract for use as collateral.
     * @param nftContract ERC-721 contract to whitelist.
     */
    function approveCollection(address nftContract) external onlyOwner {
        require(nftContract != address(0), "Escrow: zero address");
        approvedCollections[nftContract] = true;
        emit CollectionApproved(nftContract);
    }

    /**
     * @notice Remove an NFT contract from the allowlist.
     *         Does not affect existing loans using that collection.
     * @param nftContract ERC-721 contract to delist.
     */
    function revokeCollection(address nftContract) external onlyOwner {
        approvedCollections[nftContract] = false;
        emit CollectionRevoked(nftContract);
    }

    // ─── Borrower actions ────────────────────────────────────────────────────

    /**
     * @notice Deposit an NFT into escrow to open a loan.
     * @dev    The NFT's contract must be on the approved-collection allowlist.
     *         The caller must have called nftContract.approve(escrowAddress, tokenId)
     *         (or setApprovalForAll) before calling this function.
     * @param loanId      Unique identifier for this loan (generated off-chain).
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
        require(approvedCollections[nftContract], "Escrow: collection not approved");

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
     */
    function releaseToOwner(uint256 loanId) external onlyOwner nonReentrant {
        Loan storage loan = _loans[loanId];
        require(loan.borrower != address(0), "Escrow: loan not found");
        require(loan.status == LoanStatus.Active, "Escrow: loan not active");

        loan.status = LoanStatus.Released;
        IERC721(loan.nftContract).transferFrom(address(this), loan.borrower, loan.tokenId);

        emit NFTReleased(loanId, loan.borrower, loan.nftContract, loan.tokenId);
    }

    /**
     * @notice Sweep the escrowed NFT to the shop wallet on loan default.
     */
    function sweepToShop(uint256 loanId) external onlyOwner nonReentrant {
        Loan storage loan = _loans[loanId];
        require(loan.borrower != address(0), "Escrow: loan not found");
        require(loan.status == LoanStatus.Active, "Escrow: loan not active");

        loan.status = LoanStatus.Swept;
        IERC721(loan.nftContract).transferFrom(address(this), shopAddress, loan.tokenId);

        emit NFTSweptToShop(loanId, shopAddress, loan.nftContract, loan.tokenId);
    }

    /**
     * @notice Update the shop wallet address (e.g. after a key rotation).
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
