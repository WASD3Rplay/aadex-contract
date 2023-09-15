// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.12;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract SampleErc20 is ERC20, ERC20Burnable, Ownable {
  constructor() ERC20('Nectar Sample ERC20 Token', 'NECTAR') {
    // do nothing
  }
}
