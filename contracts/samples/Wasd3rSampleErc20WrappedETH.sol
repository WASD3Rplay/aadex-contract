// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.12;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract Wasd3rSampleErc20WrappedETH is ERC20, ERC20Burnable, Pausable, Ownable {
  constructor() ERC20('Wasd3r Demo Wrapped ETH', 'WETH') {
    _mint(msg.sender, 10 ** 30);
  }

  function pause() public onlyOwner {
    _pause();
  }

  function unpause() public onlyOwner {
    _unpause();
  }

  /**
   * !!! WARNING !!!
   * Do NOT use this contract in any mainnet blockchain network
   * because anyone can mint USDT.
   */
  function mint(address to, uint256 amount) public {
    _mint(to, amount);
  }

  function _beforeTokenTransfer(address from, address to, uint256 amount) internal override whenNotPaused {
    super._beforeTokenTransfer(from, to, amount);
  }

  /**
   * @dev Returns the number of decimals used to get its user representation.
   * For example, if `decimals` equals `2`, a balance of `505` tokens should
   * be displayed to a user as `5.05` (`505 / 10 ** 2`).
   *
   * Tokens usually opt for a value of 18, imitating the relationship between
   * Ether and Wei. This is the value {ERC20} uses, unless this function is
   * overridden;
   *
   * NOTE: This information is only used for _display_ purposes: it in
   * no way affects any of the arithmetic of the contract, including
   * {IERC20-balanceOf} and {IERC20-transfer}.
   */
  function decimals() public view virtual override returns (uint8) {
    return 18;
  }
}
