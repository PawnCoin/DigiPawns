// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Layout-only reconstruction from the supplied V2 source.
/// @dev This does not replace verification of the actual live implementation source.
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
    mapping(bytes32 => bool) private _activeCollateral;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }
    function initialize(address shop,address initialOwner) external initializer {
        __Ownable_init(initialOwner); __Pausable_init(); shopAddress=shop; goldRewardMultiplier=150;
    }
    function _authorizeUpgrade(address) internal override onlyOwner {}
}


