// SPDX-License-Identifier: MIT
// AADex Contracts (v0.2.0)

pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */
/* solhint-disable reason-string */

import '../libs/LibDexOrder.sol';

interface IAADexManager {
  /// Return whether given account address is swap caller or not.
  /// @param addr swap caller address
  function isSwapCaller(address addr) external view returns (bool);

  /// Swap buyer's quote token amount and seller's base token amount.
  /// @param tradeId trade ID, equivalent to a group of trade items
  /// @param tradeItemId trade item ID, equivalent to a user operation
  /// @param buyerOrder DexOrder created by buyer
  /// @param buyer buyer EOA address which signed the `buyerOrder`
  /// @param buyerFeeAmount buyer would pay a fee as the base ticker
  /// @param sellerOrder DexOrder created by seller
  /// @param seller seller EOA address which signed the `sellerOrder`
  /// @param sellerFeeAmount seller would pay a fee as the quote ticker
  /// @param baseTokenKey base token key
  /// @param baseTokenAmount base token amount
  /// @param quoteTokenKey quote token key
  /// @param quoteTokenAmount quote token amount
  /// @param feeCollector fee collector address
  function swapBySwapCaller(
    uint256 tradeId,
    uint256 tradeItemId,
    DexOrder calldata buyerOrder,
    address buyer,
    uint256 buyerFeeAmount,
    DexOrder calldata sellerOrder,
    address seller,
    uint256 sellerFeeAmount,
    string memory baseTokenKey,
    uint256 baseTokenAmount,
    string memory quoteTokenKey,
    uint256 quoteTokenAmount,
    address feeCollector
  ) external;
}
