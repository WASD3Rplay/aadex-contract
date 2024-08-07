// SPDX-License-Identifier: MIT
// AADex Contracts (v0.2.0)

pragma solidity ^0.8.20;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

import '../aadex/IAADexManager.sol';
import '../core/BaseAccount.sol';
import '../libs/LibDexOrder.sol';
import '../utils/Exec.sol';

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */

/// @title AADexManager manages main function endpoints of AADex.
/// @author Aaron aaron@wasd3r.xyz @aaronbbabam
contract AADexSwapCaller is BaseAccount {
  using ECDSA for bytes32;
  using LibDexOrder for DexOrder;

  string version = '1.7';

  address public owner;

  /* ------------------------------------------------------------------------------------------------------------------
   * Catch native token transfer
   */

  receive() external payable {}

  /* ------------------------------------------------------------------------------------------------------------------
   * Initialize
   */

  constructor(address dm, address ep) {
    owner = msg.sender;
    _dexManager = IAADexManager(dm);
    _entryPoint = IEntryPoint(ep);
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Manage Dex Manager
   */

  IAADexManager public _dexManager;

  function dexManager() public view virtual returns (IAADexManager) {
    return _dexManager;
  }

  /// Set dex manager.
  /// @param dm DexManager contract address
  function setDexManager(address dm) public {
    require(msg.sender == owner, 'Only contract account owner can call this function');
    _dexManager = IAADexManager(dm);
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
  function setEntryPoint(address ep) public {
    require(msg.sender == owner, 'Only contract account owner can call this function');
    _entryPoint = IEntryPoint(ep);
  }

  function _validateSignature(
    UserOperation calldata userOp,
    bytes32 userOpHash
  ) internal virtual override returns (uint256 validationData) {
    bytes32 hash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
    address userOpSigner = hash.recover(userOp.signature);

    if (owner != userOpSigner) {
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
  event DexSwapCallerSwapped(
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
  event DexSwapCallerSwapFailReason(uint256 tradeId, uint256 tradeItemId, string reason);
  event DexSwapCallerSwapFailUnknown(uint256 tradeId, uint256 tradeItemId, bytes reason);

  event SwapCallerStepLog(string message, int32 step, int32 subStep);

  /// Swap buyer's quote token and seller's base token.
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
    emit SwapCallerStepLog(string.concat('Started:', Strings.toHexString(uint256(uint160(msg.sender)), 20)), 0, 0);
    _requireFromEntryPoint();

    emit SwapCallerStepLog(Strings.toHexString(uint256(uint160(address(_dexManager))), 20), 1, 0);

    try
      _dexManager.swapBySwapCaller(
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
      )
    {
      emit DexSwapCallerSwapped(
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
    } catch Error(string memory reason) {
      // caused by `revert` or `require`
      emit DexSwapCallerSwapFailReason(tradeId, tradeItemId, reason);
    } catch (bytes memory reason) {
      // caused by other cases
      emit DexSwapCallerSwapFailUnknown(tradeId, tradeItemId, reason);
    }
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Transfer token
   */

  /// Transfer given token amount by `tKey` from `from` trading wallet to `to` trading wallet.
  /// Only account owner can transfer.
  /// @param tokenContract token contract address, if native, address should be zero address(0x0).
  /// @param to account address to which the token would be transferred
  /// @param amount request amount to transfer
  function transferToken(address tokenContract, address to, uint256 amount) public {
    require(amount > 0, 'Amount should be bigger than zero');

    require(_dexManager.isSwapCaller(msg.sender), 'The dex manager admins can transfer tokens');

    if (tokenContract == address(0x0)) {
      payable(to).transfer(amount);
    } else {
      (bool success, bytes memory data) = address(tokenContract).call(
        abi.encodeWithSignature('transfer(address,uint256)', to, amount)
      );
      bool returnBool = abi.decode(data, (bool));
      require(success, 'Fail to call transfer ERC20 token');
      require(returnBool, 'Fail to transfer ERC20 token');
    }
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Withdraw token from EntryPoint
   */

  function withdrawTokenFromEntryPoint(address to, uint256 amount) public {
    require(amount > 0, 'Amount should be bigger than zero');

    require(_dexManager.isSwapCaller(msg.sender), 'The dex manager admins can withdraw tokens');

    (bool success, ) = address(_entryPoint).call(abi.encodeWithSignature('withdrawTo(address,uint256)', to, amount));
    require(success, 'Fail to withdraw token from EntryPoint');
  }
}
