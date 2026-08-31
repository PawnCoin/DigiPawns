// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
contract MockERC721V3 is ERC721 {
    constructor() ERC721("Mock NFT", "MNFT") {}
    function mint(address to,uint256 tokenId) external { _mint(to,tokenId); }
}


