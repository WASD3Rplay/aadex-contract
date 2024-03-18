// SPDX-License-Identifier: MIT
// AADex Contracts (v0.2.0)

pragma solidity ^0.8.12;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

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

  address public owner;
  IAADexManager public _dexManager;

  /* ------------------------------------------------------------------------------------------------------------------
   * Catch native token transfer
   */

  receive() payable external {}

  /* ------------------------------------------------------------------------------------------------------------------
   * Initialize
   */

  constructor(address dm, address ep) {
    owner = msg.sender;
    _dexManager = IAADexManager(dm);
    _entryPoint = IEntryPoint(ep);
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
    bytes32 hash = userOpHash.toEthSignedMessageHash();
    address userOpSigner = hash.recover(userOp.signature);

    if (owner != userOpSigner) {
      return _packValidationData(true, 0, 0);
    }
    return 0;
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Swap
   */

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
    _requireFromEntryPoint();
    _dexManager.swapBySwapCaller(
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
      (bool check, bytes memory data) = address(tokenContract).call(
        abi.encodeWithSignature('transfer(address,uint256)', to, amount)
      );
      bool returnBool = abi.decode(data, (bool));
      require(returnBool, 'Fail to transfer ERC20 token');
    }
  }
}