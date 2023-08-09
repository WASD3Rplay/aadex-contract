// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.12;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

import '../libs/LibDexOrder.sol';

import './Wasd3rDexAccountManager.sol';

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */
/**
 * @title Wasd3rDexManager - manages Wasd3r Dex overall.
 */
contract Wasd3rDexManager is Wasd3rDexAccountManager {
  using ECDSA for bytes32;
  using LibDexOrder for DexOrder;

  constructor() {
    initDexAccountManager();
  }

  receive() external payable {
    depositDexNativeToken(msg.sender);
  }

  event DexSwapped(
    uint256 tradeId,
    uint256 tradeItemId,
    address indexed buyer,
    address indexed seller,
    uint256 buyerFeeAmount,
    uint256 sellerFeeAmount,
    string baseTokenKey,
    uint256 baseTokenAmount,
    string quoteTokenKey,
    uint256 quoteTokenAmount,
    address feeCollector
  );

  function _verifyOrderSign(address orderSigner, DexOrder calldata dexOrder) private view returns (bool) {
    bytes32 dexOrderHash = keccak256(abi.encode(dexOrder.hash(), address(this), block.chainid));
    bytes32 ethHash = dexOrderHash.toEthSignedMessageHash();
    address signer = ethHash.recover(dexOrder.signature);
    return orderSigner == signer;
  }

  function swap(
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
  ) public {
    // 1. Verify buyer and seller signature.
    require(_verifyOrderSign(buyer, buyerOrder), 'Order is not signed by buyer');
    require(_verifyOrderSign(seller, sellerOrder), 'Order is not signed by seller');

    DexTokenInfo memory baseDti = dexTokens[baseTokenKey];

    // 2. Verify parameters
    require(baseTokenAmount <= sellerOrder.requestAmount, 'Request amount is not acceptable in seller dex order');
    require(
      quoteTokenAmount <= (buyerOrder.requestAmount / 10 ** baseDti.decimals) * buyerOrder.price,
      'Request amount is not acceptable in buyer dex order'
    );

    // 3. Process base token related
    // Increase BUYER base token amount
    addDexToken(buyer, baseTokenKey, baseTokenAmount - buyerFeeAmount);
    // Decrease SELLER base token amount
    subtractDexToken(seller, baseTokenKey, baseTokenAmount);
    // Increase fee collector (ADMIN) base token amount by BUYER's fee
    addDexToken(feeCollector, baseTokenKey, buyerFeeAmount);

    // 4. Process quote token related
    // Decrease BUYER quote token amount
    subtractDexToken(buyer, quoteTokenKey, quoteTokenAmount);
    // Increase SELLER quote token amount
    addDexToken(seller, quoteTokenKey, quoteTokenAmount - sellerFeeAmount);
    // Increase fee collector (ADMIN) quote token amount by SELLER's fee
    addDexToken(feeCollector, quoteTokenKey, sellerFeeAmount);

    emit DexSwapped(
      tradeId,
      tradeItemId,
      buyer,
      seller,
      buyerFeeAmount,
      sellerFeeAmount,
      baseTokenKey,
      baseTokenAmount,
      quoteTokenKey,
      quoteTokenAmount,
      feeCollector
    );
  }
}
