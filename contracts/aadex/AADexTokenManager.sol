// SPDX-License-Identifier: MIT
// AADex Contracts (v0.2.0)

pragma solidity ^0.8.12;

import '../interfaces/IWasd3rERC20.sol';
import '../interfaces/IWasd3rERC1155.sol';
import '../libs/LibAddress.sol';
import '../libs/LibUint.sol';

import './AADexAccessControl.sol';

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */

/// @title AADexTokenManager manages all token information used in AA Dex.
/// @author Aaron aaron@wasd3r.xyz @aaronbbabam
abstract contract AADexTokenManager is AADexAccessControl {
  using LibAddress for address;
  using LibUint for uint256;
  using LibUint for uint8;

  /* ------------------------------------------------------------------------------------------------------------------
   * Structs
   */

  /// @notice Token data structure
  /// @param isValid whether the token is valid or not
  /// @param contractAddress token contract address
  /// @param decimals token decimals (e.g. ETH:18, USDT:6)
  /// @param tokenType token type (native:0, ERC20:1, ERC1155: 2)
  /// @param tokenName token name (symbol)
  /// @param tokenId token ID using for ERC1155, 0 for others
  struct DexTokenInfo {
    bool isValid;
    address contractAddress;
    uint8 decimals;
    uint8 tokenType;
    string tokenName;
    uint256 tokenId;
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * External variables
   */

  /// @notice Constant variable for the native token key
  string public constant DEX_TOKEN_NATIVE_TOKEN_KEY = '0:__native__:0:18';

  /// @notice Map that stores token information with `TokenKey` as the key.
  mapping(string => DexTokenInfo) public dexTokens;

  /* ------------------------------------------------------------------------------------------------------------------
   * Initialize
   */

  /// Initialize this token manager contract.
  function initDexTokenManager() internal {
    initDexAc();

    // Register the native token.
    registerDexToken(0, address(0), 0, 18, '');
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Register Token
   */

  /// Event when a new token is registered
  /// @param byWhom this action is triggered by whom
  /// @param tKey token key
  /// @param tAddr token contract address
  /// @param tName token name (symbol)
  /// @param tType token type (native:0, ERC20:1, ERC1155: 2)
  /// @param tDecs token decimals (e.g. ETH:18, USDT:6)
  /// @param tId token ID using for ERC1155, 0 for others
  event DexTokenRegistered(
    address indexed byWhom,
    string tKey,
    address indexed tAddr,
    string tName,
    uint8 tType,
    uint8 tDecs,
    uint256 tId
  );

  /// Registers a new token.
  /// @param tType token type (native:0, ERC20:1, ERC1155: 2)
  /// @param tAddr token contract address
  /// @param tId token ID using for ERC1155, 0 for others
  /// @param tDecs token decimals (e.g. ETH:18, USDT:6)
  /// @param tName token name (symbol)
  function registerDexToken(
    uint8 tType,
    address tAddr,
    uint256 tId,
    uint8 tDecs,
    string memory tName
  ) public dexEssential {
    string memory tKey;
    address cAddr = tAddr;
    uint8 decimals = tDecs;
    string memory name = tName;
    uint256 id = 0;

    if (tType == 0) {
      // native token (e.g. ETH)

      tKey = DEX_TOKEN_NATIVE_TOKEN_KEY;
      cAddr = address(0);

      if (decimals <= 0) {
        decimals = 18;
      }

      name = '__native__';
    } else if (tType == 1) {
      // ERC20 token

      tKey = getTokenKey(tType, tAddr, tId, tDecs);
      IWasd3rERC20 tokenContract = IWasd3rERC20(cAddr);

      if (decimals <= 0) {
        decimals = tokenContract.decimals();
      }

      if (bytes(name).length == 0) {
        name = tokenContract.symbol();
      }
    } else {
      require(false, 'Unsupported token type');
    }

    DexTokenInfo storage dti = dexTokens[tKey];
    dti.isValid = true;
    dti.contractAddress = cAddr;
    dti.decimals = decimals;
    dti.tokenType = tType;
    dti.tokenName = name;
    dti.tokenId = id;

    emit DexTokenRegistered(msg.sender, tKey, cAddr, name, tType, decimals, id);
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Deregister Token
   */

  /// Event when a new token is deregistered
  /// @param byWhom this action is triggered by whom
  /// @param tKey token key
  event DexTokenDeregistered(address indexed byWhom, string tKey);

  /// Deregister the token.
  /// @param tKey token key to deregister
  function deregisterDexToken(string memory tKey) public dexEssential {
    delete dexTokens[tKey];
    emit DexTokenDeregistered(msg.sender, tKey);
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Public Views
   */

  /// Return a token key by input data.
  /// @param tType token type (native:0, ERC20:1, ERC1155: 2)
  /// @param tAddr token contract address
  /// @param tId token ID using for ERC1155, 0 for others
  /// @param tDecs token decimals (e.g. ETH:18, USDT:6)
  function getTokenKey(uint8 tType, address tAddr, uint256 tId, uint8 tDecs) public pure returns (string memory) {
    if (tType == 0) {
      return DEX_TOKEN_NATIVE_TOKEN_KEY;
    }

    string memory t = tType.uint8ToString();
    string memory a = tAddr.toAsciiString();
    string memory i = tId.uint256ToString();
    string memory d = tDecs.uint8ToString();

    return string(abi.encodePacked(t, ':', a, ':', i, ':', d));
  }
}
