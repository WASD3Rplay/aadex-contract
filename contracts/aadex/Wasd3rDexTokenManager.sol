// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.12;

import '../interfaces/IWasd3rERC20.sol';
import '../interfaces/IWasd3rERC1155.sol';
import '../lib/LibAddress.sol';
import '../lib/LibUint.sol';

import './Wasd3rDexAccessControl.sol';

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */
/**
 * @title Wasd3rDexTokenManager - manages registered tokens in Wasd3r AA Dex.
 */
abstract contract Wasd3rDexTokenManager is Wasd3rDexAccessControl {
  using LibAddress for address;
  using LibUint for uint256;
  using LibUint for uint8;

  string public constant DEX_TOKEN_NATIVE_TOKEN_KEY = '0:__native__:0:18';

  event DexTokenRegistered(
    address indexed byWhom,
    string indexed tokenKey,
    address indexed tokenAddress,
    string tokenName,
    uint8 tokenType,
    uint8 tokenDecimals,
    uint256 tokenId
  );
  event DexTokenDeregistered(address indexed byWhom, string indexed tokenKey);

  /**
   * @param contractAddress the token contract address
   * @param decimals the token contract address
   * @dev sizes were chosen so that (deposit) fit into one cell (used during handleOps)
   *    and the rest fit into a 2nd cell.
   *    112 bit allows for 10^15 eth
   *    48 bit for full timestamp
   *    32 bit allows 150 years for unstake delay
   */
  struct DexTokenInfo {
    bool isValid;
    address contractAddress;
    uint8 decimals;
    uint8 tokenType; // native (e.g. ETH): 0, ERC20: 1, ERC1155: 2
    string tokenName;
    uint256 tokenId; // for ERC1155
  }

  /**
   * @dev `dexTokens` has an unique token key as the key and `DexTokenInfo` as the value.
   */
  mapping(string => DexTokenInfo) public dexTokens;

  /**
   * (internal) Initialize this dex token contract.
   */
  function initDexToken() internal {
    initDexAc();
    registerDexToken(0, address(0), 0, 18, '');
  }

  /**
   * Returns unique token key.
   * `tokenKey` is a unique string:
   *    <token_type>:<token_address>:<token_id>:<token_decimals>
   */
  function getTokenKey(
    uint8 tokenType, // native(0), ERC20(1), ERC1155(2)
    address tokenAddress,
    uint256 tokenId,
    uint8 tokenDecimals
  ) public pure returns (string memory) {
    if (tokenType == 0) {
      return DEX_TOKEN_NATIVE_TOKEN_KEY;
    }

    string memory t = tokenType.uint8ToString();
    string memory a = tokenAddress.toAsciiString();
    string memory i = tokenId.uint256ToString();
    string memory d = tokenDecimals.uint8ToString();

    return string(abi.encodePacked(t, ':', a, ':', i, ':', d));
  }

  /**
   * Returns `DexTokenInfo` of given token key.
   * @param tokenKey unique token key to find out `DexTokenInfo`
   */
  function getDexTokenInfo(string memory tokenKey) public view returns (DexTokenInfo memory info) {
    return dexTokens[tokenKey];
  }

  /**
   * (ADMIN) Registers a new token info.
   * @param tokenType token type (native:0, ERC20:1, ERC1155: 2)
   * @param tokenAddress token contract address
   * @param tokenId token ID using for ERC1155, 0 for others
   * @param tokenDecimals token decimals (e.g. ETH:18, USDT:6)
   * @param tokenName token name (symbol)
   */
  function registerDexToken(
    uint8 tokenType,
    address tokenAddress,
    uint256 tokenId,
    uint8 tokenDecimals,
    string memory tokenName
  ) public {
    string memory tokenKey;
    address contractAddress = tokenAddress;
    uint8 decimals = tokenDecimals;
    string memory name = tokenName;
    uint256 id = 0;

    if (tokenType == 0) {
      // native token (e.g. ETH)
      tokenKey = DEX_TOKEN_NATIVE_TOKEN_KEY;
      contractAddress = address(0);

      if (decimals <= 0) {
        decimals = 18;
      }

      if (bytes(name).length == 0) {
        name = '__native__';
      }
    } else if (tokenType == 1) {
      tokenKey = getTokenKey(tokenType, tokenAddress, tokenId, tokenDecimals);
      // ERC20 token
      IWasd3rERC20 tokenContract = IWasd3rERC20(contractAddress);

      if (decimals <= 0) {
        decimals = tokenContract.decimals();
      }

      if (bytes(name).length == 0) {
        name = tokenContract.symbol();
      }
    } else if (tokenType == 2) {
      tokenKey = getTokenKey(tokenType, tokenAddress, tokenId, tokenDecimals);
      // ERC1155 token
      // IWasd3rERC1155 tokenContract = IWasd3rERC1155(contractAddress);
      id = tokenId;
    }

    DexTokenInfo storage info = dexTokens[tokenKey];
    info.isValid = true;
    info.contractAddress = contractAddress;
    info.decimals = decimals;
    info.tokenType = tokenType;
    info.tokenName = name;
    info.tokenId = id;

    emit DexTokenRegistered(msg.sender, tokenKey, contractAddress, name, tokenType, decimals, id);
  }

  /**
   * (ADMIN) Deregisters the token info from the managed map.
   * @param tokenKey unique token key string
   */
  function deregisterDexToken(string memory tokenKey) public {
    delete dexTokens[tokenKey];

    emit DexTokenDeregistered(msg.sender, tokenKey);
  }

  /**
   * Returns whether the token exists or not.
   * @param tokenKey unique token key string
   */
  function isValidDexToken(string memory tokenKey) public view returns (bool) {
    return dexTokens[tokenKey].isValid;
  }
}
