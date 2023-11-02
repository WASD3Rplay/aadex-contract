// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.12;

import './Wasd3rDexTokenManager.sol';

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */
/**
 * @title Wasd3rDexAccountManager - user accounts' deposited tokens by Wasd3r Dex.
 */
abstract contract Wasd3rDexAccountManager is Wasd3rDexTokenManager {
  /**
   * @param amount the user deposited token amount
   * @param lastDepositBlockNo the block number when a user deposited the token lastly
   * @param lastDepositBlockNoIdx deposit index in the same block of the last deposit. If only once, it would be 0.
   * @param lastWithdrawtBlockNo the block number when a user withdrew the token lastly
   * @param lastWithdrawBlockNoIdx withdraw index in the same block of the last withdraw. If onle once, it would be 0.
   */
  struct DexDepositInfo {
    uint256 amount;
    uint lastDepositBlockNo;
    uint lastDepositBlockNoIdx;
    uint lastWithdrawBlockNo;
    uint lastWithdrawBlockNoIdx;
  }

  /**
   * @dev `dexAccounts` has
   *    - an account address as the first key,
   *    - a unique token key string as the second key, and
   *    - `DexDepositInfo` as a value.
   *
   * e.g.
   *    - Alice (0xalice00) has 10 ETH == dexAccounts['0xalice00']['0:__native__:0'] = 10 * 1e18
   *    - Bill  (0xbill000) has 1 USDT == dexAccounts['0xbill000']['0:0xusdtAddr:0'] = 1 * 1e6
   *    - Carl  (0xcarl000) has 1 QWER == dexAccounts['0xcarl000']['0:0xqwer1155:0'] = 1 * 1e8
   */
  mapping(address => mapping(string => DexDepositInfo)) public dexAccounts;
  event DexAccountDeposited(address indexed from, address indexed to, string tokenKey, uint256 amount, uint256 total);
  event DexAccountWithdrawn(address indexed from, address indexed to, string tokenKey, uint256 amount, uint256 total);
  event DexAccountTokenDepositEnabled(address indexed addr, address indexed byWhom);
  event DexAccountTokenDepositDisabled(address indexed addr, address indexed byWhom);

  /**
   * @param isInitialized the account is initialized or not
   * @param isValid the account is valid or invalid
   */
  struct DexAccountValid {
    bool isInitialized;
    bool isValid;
  }

  /**
   * @notice If the account is not valid, all `dexAccount`, that the account owned, would be also invalid.
   */
  mapping(address => DexAccountValid) public dexAccountsValid;
  event DexAccountEnabled(address indexed addr, address indexed byWhom);
  event DexAccountDisabled(address indexed addr, address indexed byWhom);

  /**
   * (internal) Initialize this dex account deposit contract.
   */
  function initDexAccountManager() internal {
    initDexTokenManager();
  }

  /**
   * Returns `DexDepositInfo` of given user's wallet address and token address.
   * @param account user wallet address
   * @param tokenKey unique token key string
   */
  function getDexDepositInfo(address account, string memory tokenKey) public view returns (DexDepositInfo memory info) {
    return dexAccounts[account][tokenKey];
  }

  /**
   * Returns account's native token amount.
   * @param account user wallet address
   */
  function getDexNativeBalanceOf(address account) public view returns (uint256) {
    return dexAccounts[account][DEX_TOKEN_NATIVE_TOKEN_KEY].amount;
  }

  /**
   * Returns account's given token amount.
   * @param account user wallet address
   * @param tokenKey unique token key string
   */
  function getDexBalanceOf(address account, string memory tokenKey) public view returns (uint256) {
    return dexAccounts[account][tokenKey].amount;
  }

  /**
   * Adds the input amount to the target address by token.
   * @param to target address
   * @param tokenKey token key
   * @param amount token amount adding to the target address
   */
  function addDexToken(address to, string memory tokenKey, uint256 amount) internal returns (DexDepositInfo storage) {
    DexAccountValid memory dav = dexAccountsValid[to];
    require(
      !dav.isInitialized || (dav.isInitialized && dav.isValid),
      'Deposit account (to address) is invalid to add the input amount'
    );

    if (!dav.isInitialized) {
      DexAccountValid storage sdav = dexAccountsValid[to];
      sdav.isInitialized = true;
      sdav.isValid = true;
    }

    DexDepositInfo storage ddi = dexAccounts[to][tokenKey];
    ddi.amount = ddi.amount + amount;
    return ddi;
  }

  /**
   * Subtracts the input amount from the target address by token.
   * @param from target address
   * @param tokenKey token key
   * @param amount token amount subtracting from the target address
   */
  function subtractDexToken(
    address from,
    string memory tokenKey,
    uint256 amount
  ) internal returns (DexDepositInfo storage) {
    DexAccountValid memory dav = dexAccountsValid[from];
    require(
      !dav.isInitialized || (dav.isInitialized && dav.isValid),
      'Deposit account (from address) is invalid to subtract the input amount'
    );

    DexDepositInfo storage ddi = dexAccounts[from][tokenKey];
    require(ddi.amount >= amount, 'Deposit amount is less than the input amount to subtract');

    ddi.amount = ddi.amount - amount;
    return ddi;
  }

  function _depositDexToken(address from, address to, string memory tokenKey, uint256 amount) private {
    DexDepositInfo storage ddi = addDexToken(to, tokenKey, amount);

    // Set the last deposit time.
    uint blockNo = ddi.lastDepositBlockNo;
    if (blockNo != block.number) {
      ddi.lastDepositBlockNo = block.number;
      ddi.lastDepositBlockNoIdx = 0;
    } else {
      ddi.lastDepositBlockNoIdx++;
    }

    emit DexAccountDeposited(from, to, tokenKey, amount, ddi.amount);
  }

  function depositDexNativeToken(address to) public payable {
    _depositDexToken(msg.sender, to, DEX_TOKEN_NATIVE_TOKEN_KEY, msg.value);
  }

  /**
   * Deposit given token amount into given user account.
   * Anyone can send a token amount to given user account.
   * @param to user wallet address to deposit given token amount
   * @param tokenKey unique token key string
   * @param amount deposit amount
   */
  function depositDexToken(address to, string memory tokenKey, uint256 amount) public payable {
    DexTokenInfo storage dti = dexTokens[tokenKey];

    require(dti.isValid, 'token is invalid');
    require(msg.sender == to || dexAdmins[msg.sender], 'Only admin or owner can call this function');

    // native token
    if (dti.tokenType == 0) {
      depositDexNativeToken(to);
      return;
    }
    // ERC20
    else if (dti.tokenType == 1) {
      IWasd3rERC20 tokenContract = IWasd3rERC20(dti.contractAddress);

      uint256 allow = tokenContract.allowance(to, address(this));
      require(allow >= amount, 'Amount is not allowed in the ERC20 contract');

      bool success = tokenContract.transferFrom(to, address(this), amount);
      require(success, 'Fail to deposit ERC20 token');
    }
    // ERC1155
    else if (dti.tokenType == 2) {
      IWasd3rERC1155 tokenContract = IWasd3rERC1155(dti.contractAddress);
      tokenContract.safeTransferFrom(msg.sender, address(this), dti.tokenId, amount, '');
    } else {
      require(false, 'Unsupported token type');
    }

    // When the message sender sends native token accidently,
    if (msg.value > 0) {
      depositDexNativeToken(to);
    }

    _depositDexToken(msg.sender, to, tokenKey, amount);
  }

  /**
   * Withdraw given token amount into given user withdraw account.
   * Only account owner can withdraw.
   * @param withdrawAddress user wallet address who receive the withdrawn token amount
   * @param tokenKey unique token key string
   * @param amount withdraw token amount
   */
  function withdrawDexToken(address withdrawAddress, string memory tokenKey, uint256 amount) public {
    DexAccountValid storage dav = dexAccountsValid[msg.sender];
    DexDepositInfo storage ddi = dexAccounts[msg.sender][tokenKey];
    DexTokenInfo storage dti = dexTokens[tokenKey];

    require(dav.isInitialized && dav.isValid, 'Withdraw account (from address) is invalid');
    require(ddi.amount >= amount, 'Not enough deposit to withdraw');

    ddi.amount = ddi.amount - amount;

    // native token
    if (dti.tokenType == 0) {
      (bool success, ) = withdrawAddress.call{value: amount}('');
      require(success, 'Fail to withdraw native token');
    }
    // ERC20
    else if (dti.tokenType == 1) {
      IWasd3rERC20 tokenContract = IWasd3rERC20(dti.contractAddress);
      bool success = tokenContract.transfer(withdrawAddress, amount);
      require(success, 'Fail to deposit ERC20 token');
    }
    // ERC1155
    else if (dti.tokenType == 2) {
      IWasd3rERC1155 tokenContract = IWasd3rERC1155(dti.contractAddress);
      tokenContract.safeTransferFrom(address(this), withdrawAddress, dti.tokenId, amount, '');
    } else {
      require(false, 'Unsupported token type');
    }

    // Set the last withdraw time.
    uint blockNo = ddi.lastWithdrawBlockNo;
    if (blockNo != block.number) {
      ddi.lastWithdrawBlockNo = block.number;
      ddi.lastWithdrawBlockNoIdx = 0;
    } else {
      ddi.lastWithdrawBlockNoIdx++;
    }

    emit DexAccountWithdrawn(msg.sender, withdrawAddress, tokenKey, amount, ddi.amount);
  }

  /**
   * Disable given account.
   * @param account user wallet address
   */
  function disableAccount(address account) public {
    require(dexAdmins[msg.sender] || msg.sender == account, 'Only admin or account owner can call this function');
    DexAccountValid storage dav = dexAccountsValid[account];
    dav.isInitialized = true;
    dav.isValid = false;
    emit DexAccountDisabled(account, msg.sender);
  }

  /**
   * (ADMIN) Enable given account.
   * @param account user wallet address
   */
  function enableAccount(address account) public onlyDexAdmin {
    DexAccountValid storage dav = dexAccountsValid[account];
    dav.isInitialized = true;
    dav.isValid = true;
    emit DexAccountEnabled(account, msg.sender);
  }
}
