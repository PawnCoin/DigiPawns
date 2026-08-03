// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Minimal ERC-20 used only in tests. Not for production use.
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    /// @notice Mint `amount` tokens to `to`.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
