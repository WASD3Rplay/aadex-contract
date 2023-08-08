// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.12;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IWasd3rERC20 is IERC20 {
  function decimals() external view returns (uint8);

  function symbol() external view returns (string memory);
}
