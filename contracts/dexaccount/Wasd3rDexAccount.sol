// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.12;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

import '../core/BaseAccount.sol';
import '../libs/LibDexOrder.sol';

import '../aadex/IWasd3rDexManager.sol';

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */
/**
 * @title Wasd3rDexManager - manages Wasd3r Dex overall.
 */
contract Wasd3rDexAccount is BaseAccount {
  using ECDSA for bytes32;
  using LibDexOrder for DexOrder;

  IEntryPoint public _entryPoint;
  IWasd3rDexManager public _dexManager;

  constructor(address dexManagerAddress) {
    _dexManager = IWasd3rDexManager(dexManagerAddress);
  }

  receive() external payable {
    dexManager().depositDexNativeToken(msg.sender);
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

  function dexManager() public view virtual override returns (IWasd3rDexManager) {
    return _dexManager;
  }

  /**
   * (SU) Set entiry point.
   * @param ep EntryPoint contract address
   */
  function setEntryPoint(address ep) public {
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
    dexManager().swap(
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
