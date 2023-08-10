// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.12;

/* solhint-disable no-inline-assembly */

/**
 * Dex order created by user
 * @param orderId order ID
 * @param orderType BUY:0, SELL:1
 * @param baseTokenAddr token address for base ticker (native token: address(0))
 * @param quoteTokenAddr token address for quote ticker
 * @param price the quote price to buy 1 base token
 * @param requestAmount requested amount of base token
 * @param signature signature over the entire request, the EntryPoint address and the chain ID.
 */
struct DexOrder {
  uint256 orderId;
  uint256 orderType;
  address baseTokenAddr;
  address quoteTokenAddr;
  uint256 price;
  uint256 requestAmount;
  bytes signature;
}

/**
 * Utility functions helpful when working with DexOrder struct.
 */
library LibDexOrder {
  function packForVerify(DexOrder calldata dexOrder) internal pure returns (bytes memory ret) {
    // `orderId` is not included in the signed data because it isn't set by user.
    uint256 orderType = dexOrder.orderType;
    address baseTokenAddr = dexOrder.baseTokenAddr;
    address quoteTokenAddr = dexOrder.quoteTokenAddr;
    uint256 price = dexOrder.price;
    uint256 requestAmount = dexOrder.requestAmount;

    return abi.encode(orderType, baseTokenAddr, quoteTokenAddr, price, requestAmount);
  }

  function hash(DexOrder calldata dexOrder) internal pure returns (bytes32) {
    return keccak256(packForVerify(dexOrder));
  }
}
