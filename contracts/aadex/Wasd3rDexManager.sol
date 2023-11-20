// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.12;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

import '../core/BaseAccount.sol';
import '../libs/LibDexOrder.sol';

import './Wasd3rDexAccountManager.sol';

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */
/**
 * @title Wasd3rDexManager - manages Wasd3r Dex overall.
 */
contract Wasd3rDexManager is Wasd3rDexAccountManager, BaseAccount {
  using ECDSA for bytes32;
  using LibDexOrder for DexOrder;

  IEntryPoint public _entryPoint;

  constructor() {
    initDexAccountManager();
  }

  receive() external payable {
    depositDexNativeToken(msg.sender);
  }

  modifier onlyEntryPointOrDexAdmin() {
    require(
      msg.sender == address(entryPoint()) || dexAdmins[msg.sender],
      'Only EntryPoint or DexManager admins can call this function'
    );
    _;
  }

  function entryPoint() public view virtual override returns (IEntryPoint) {
    return _entryPoint;
  }

  /**
   * (SU) Set entiry point.
   * @param ep EntryPoint contract address
   */
  function setEntryPoint(address ep) public onlyDexSu {
    _entryPoint = IEntryPoint(ep);
  }

  function _validateSignature(
    UserOperation calldata userOp,
    bytes32 userOpHash
  ) internal virtual override returns (uint256 validationData) {
    bytes32 hash = userOpHash.toEthSignedMessageHash();
    address userOpSigner = hash.recover(userOp.signature);

    if (!dexAdmins[userOpSigner]) {
      return _packValidationData(true, 0, 0);
    }
    return 0;
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

  /**
   * (internal) Swap buyer's quote token and seller's base token.
   * This function should be called by trusty and authorized person,
   * who can create and send a transaction with multiple swap UserOperations
   * to avoid front running (MEV) attacks.
   * TODO: make swap function for each market separately and keep following the last swap time to avoid the front running attack.
   * @param tradeId trade ID, equivalent to a group of trade items
   * @param tradeItemId trade item ID, equivalent to a user operation
   * @param buyerOrder DexOrder created by buyer
   * @param buyer buyer EOA address which signed the `buyerOrder`
   * @param buyerFeeAmount buyer would pay a fee as the base ticker
   * @param sellerOrder DexOrder created by seller
   * @param seller seller EOA address which signed the `sellerOrder`
   * @param sellerFeeAmount seller would pay a fee as the quote ticker
   * @param baseTokenKey base token key
   * @param baseTokenAmount base token amount
   * @param quoteTokenKey quote token key
   * @param quoteTokenAmount quote token amount
   * @param feeCollector fee collector address
   */
  function _swap(
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
  ) internal {
    // 1. Verify buyer and seller signature.
    require(_verifyOrderSign(buyer, buyerOrder), 'Order is not signed by buyer');
    require(_verifyOrderSign(seller, sellerOrder), 'Order is not signed by seller');

    DexTokenInfo memory baseDti = dexTokens[baseTokenKey];

    // 2. Verify parameters
    require(baseTokenAmount <= sellerOrder.requestAmount, 'Request amount is not acceptable in seller dex order');
    if (buyerOrder.price > 0) {
      require(
        quoteTokenAmount <= (buyerOrder.requestAmount * buyerOrder.price) / 10 ** baseDti.decimals,
        'Request amount is not acceptable in buyer limit order'
      );
    } else {
      require(quoteTokenAmount <= buyerOrder.requestAmount, 'Request amount is not acceptable in buyer market order');
    }

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

  /**
   * (ADMIN) Swap buyer's quote token and seller's base token.
   */
  function swapByAdmin(
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
  ) public onlyDexAdmin {
    _swap(
      tradeId,
      tradeItemId,
      buyerOrder,
      buyer,
      buyerFeeAmount,
      sellerOrder,
      seller,
      sellerFeeAmount,
      baseTokenKey,
      baseTokenAmount,
      quoteTokenKey,
      quoteTokenAmount,
      feeCollector
    );
  }

  /**
   * (EntryPoint) Swap buyer's quote token and seller's base token.
   */
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
    _requireFromEntryPoint();
    _swap(
      tradeId,
      tradeItemId,
      buyerOrder,
      buyer,
      buyerFeeAmount,
      sellerOrder,
      seller,
      sellerFeeAmount,
      baseTokenKey,
      baseTokenAmount,
      quoteTokenKey,
      quoteTokenAmount,
      feeCollector
    );
  }
}
