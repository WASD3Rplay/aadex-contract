// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.20;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';

contract Wasd3rSampleErc20Decimal18Token is ERC20, ERC20Burnable, Pausable, Ownable {
  /**
   * !!! WARNING !!!
   * Do NOT use this contract in any mainnet blockchain network
   * because anyone can mint USDT.
   */

  string private _tokenName;
  string private _tokenSymbol;

  constructor() ERC20('Wasd3r Demo Decimal 18 Token', 'WDD18') Ownable(msg.sender) {
    _tokenName = 'Wasd3r Demo Decimal 18 Token';
    _tokenSymbol = 'WDD18';
    _mint(msg.sender, 10 ** 30);
  }

  function setName(string memory name_) public {
    _tokenName = name_;
  }

  function setSymbol(string memory symbol_) public {
    _tokenSymbol = symbol_;
  }

  function name() public view virtual override returns (string memory) {
    return _tokenName;
  }

  function symbol() public view virtual override returns (string memory) {
    return _tokenSymbol;
  }

  function pause() public onlyOwner {
    _pause();
  }

  function unpause() public onlyOwner {
    _unpause();
  }

  function mint(address account, uint256 amount) public {
    _mint(account, amount);
  }

  function burn(address account, uint256 amount) public {
    _burn(account, amount);
  }

  function decimals() public view virtual override returns (uint8) {
    return 18;
  }
}
