// SPDX-License-Identifier: MIT
// AADex Contracts (v0.2.0)

pragma solidity ^0.8.12;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/interfaces/IERC1271.sol';

import '../core/BaseAccount.sol';
import '../libs/LibDexOrder.sol';

import './IAADexManager.sol';
import './AADexAccountManager.sol';

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */

/// @title AADexManager manages main function endpoints of AADex.
/// @author Aaron aaron@wasd3r.xyz @aaronbbabam
contract AADexManager is IAADexManager, AADexAccountManager, BaseAccount {
  using ECDSA for bytes32;
  using LibDexOrder for DexOrder;

  string version = '1.7';

  /* ------------------------------------------------------------------------------------------------------------------
   * Catch native token transfer
   */

  receive() external payable {
    depositDexNativeToken(msg.sender);
  }

  /* -------------------------------------------------------------------------------------------------------------------
   * Modifiers
   */

  modifier onlyEntryPointOrDexAdmin() {
    require(
      msg.sender == address(entryPoint()) || admins[msg.sender],
      'Only EntryPoint or admins can call this function'
    );
    _;
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Initialize
   */

  constructor() {
    // Initialize all contracts: Account Manager, Token Manager, and Access Control.
    initDexAccountManager();
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Manage Entry Point
   */

  IEntryPoint public _entryPoint;

  function entryPoint() public view virtual override returns (IEntryPoint) {
    return _entryPoint;
  }

  /// Set entiry point.
  /// @param ep EntryPoint contract address
  function setEntryPoint(address ep) public dexCritical {
    _entryPoint = IEntryPoint(ep);
  }

  function _validateSignature(
    UserOperation calldata userOp,
    bytes32 userOpHash
  ) internal virtual override returns (uint256 validationData) {
    bytes32 hash = userOpHash.toEthSignedMessageHash();
    address userOpSigner = hash.recover(userOp.signature);

    if (!admins[userOpSigner]) {
      return _packValidationData(true, 0, 0);
    }
    return 0;
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Swap
   */

  /// Event when swap happened.
  /// @param tradeId trade ID
  /// @param tradeItemId trade item ID
  /// @param buyer buyer account address
  /// @param seller seller account address
  /// @param buyerFeeAmount fee amount that buyer should pay in base token
  /// @param sellerFeeAmount fee amount that seller should pay in quote token
  /// @param baseTokenKey base token key
  /// @param baseTokenAmount base token amount to swap
  /// @param quoteTokenKey quote token key
  /// @param quoteTokenAmount quote token amount to sawp
  /// @param feeCollector fee collector address
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

  function _isValidSignature(address signer, bytes32 hash, bytes memory signature) internal view returns (bool) {
    if (signer.code.length == 0) {
      (address recovered, ECDSA.RecoverError err) = ECDSA.tryRecover(hash, signature);
      return err == ECDSA.RecoverError.NoError && recovered == signer;
    } else {
      bytes32 swHash = keccak256(
        abi.encodePacked('\x19Ethereum Signed Message:\n', Strings.toString(hash.length), hash)
      );
      (bool success, bytes memory result) = signer.staticcall(
        abi.encodeCall(IERC1271.isValidSignature, (swHash, signature))
      );
      return (success &&
        result.length >= 32 &&
        abi.decode(result, (bytes32)) == bytes32(IERC1271.isValidSignature.selector));
    }
  }

  function isValidSignature(address signer, bytes32 hash, bytes memory signature) public view returns (bool) {
    return _isValidSignature(signer, hash, signature);
  }

  function _verifyOrderSign(address oSigner, DexOrder calldata dOrder) private view returns (bool) {
    bytes32 dexOrderHash = keccak256(abi.encode(dOrder.hash(), address(this), block.chainid));
    return _isValidSignature(oSigner, dexOrderHash.toEthSignedMessageHash(), dOrder.signature);
  }

  /// Swap buyer's quote token amount and seller's base token amount.
  ///
  /// This function should be called by trusty and authorized person,
  /// who can create and send a transaction with multiple swap UserOperations
  /// to avoid front running (MEV) attacks.
  ///
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
  function _swap(
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
    require(baseTokenAmount >= buyerFeeAmount, 'Buyer fee amount is too big');
    require(quoteTokenAmount >= sellerFeeAmount, 'Seller fee amount is too big');

    // 3. Process base token related
    // Increase BUYER base token amount
    _increaseDexTokenAmount(buyer, baseTokenKey, baseTokenAmount - buyerFeeAmount);
    // Decrease SELLER base token amount
    _decreaseDexTokenAmount(seller, baseTokenKey, baseTokenAmount);
    // Increase fee collector (ADMIN) base token amount by BUYER's fee
    _increaseDexTokenAmount(feeCollector, baseTokenKey, buyerFeeAmount);

    // 4. Process quote token related
    // Decrease BUYER quote token amount
    _decreaseDexTokenAmount(buyer, quoteTokenKey, quoteTokenAmount);
    // Increase SELLER quote token amount
    _increaseDexTokenAmount(seller, quoteTokenKey, quoteTokenAmount - sellerFeeAmount);
    // Increase fee collector (ADMIN) quote token amount by SELLER's fee
    _increaseDexTokenAmount(feeCollector, quoteTokenKey, sellerFeeAmount);
  }

  function swapBySwapCaller(
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
  ) public dexEssential {
    _swap(
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

  /* ------------------------------------------------------------------------------------------------------------------
   * Public Views
   */

  /// Return whethere given address is admin or not.
  /// @param addr admin address
  function isSwapCaller(address addr) public view returns (bool) {
    return admins[addr];
  }
}
