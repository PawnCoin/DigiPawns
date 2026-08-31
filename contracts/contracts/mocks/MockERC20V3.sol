// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract MockERC20V3 is ERC20 {
    constructor() ERC20("Mock USD", "mUSD") {}
    function mint(address to,uint256 amount) external { _mint(to,amount); }
}


