// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Exact legacy layout recovered from Remix build-info
/// 7df5c5859ff0563ae397db9d1f5a2b80 (Solidity 0.8.25, London, optimizer 200).
/// @dev The normalized artifact runtime matches implementation
/// 0x15059a4DE6C6C8Ac12626Ae50e470DCc32e2Fc23 byte-for-byte.
contract DigiPawnsEscrowV2Layout is OwnableUpgradeable,PausableUpgradeable,ReentrancyGuard,ERC721Holder,UUPSUpgradeable {
    enum LoanStatus { Active, Released, Swept }
    enum Tier { NONE, STANDARD, GOLD }
    struct Loan { address borrower; address nftContract; uint256 tokenId; LoanStatus status; Tier tier; }

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
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }
    function initialize(address shop,address initialOwner) external initializer {
        __Ownable_init(initialOwner); __Pausable_init(); shopAddress=shop; goldRewardMultiplier=150;
    }
    function _authorizeUpgrade(address) internal override onlyOwner {}
}

