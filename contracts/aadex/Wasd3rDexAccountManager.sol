// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.12;

import './Wasd3rDexTokenManager.sol';

import 'hardhat/console.sol';

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */
/**
 * @title Wasd3rDexAccountManager - user accounts' deposited tokens by Wasd3r Dex.
 */
abstract contract Wasd3rDexAccountManager is Wasd3rDexTokenManager {
  event DexAccountDeposited(address indexed from, address indexed to, string tokenKey, uint256 amount, uint256 total);
  event DexAccountWithdrawn(address indexed from, address indexed to, string tokenKey, uint256 amount, uint256 total);

  /**
   * @param amount the user deposited token amount
   * @dev sizes were chosen so that (deposit) fit into one cell (used during handleOps)
   *    and the rest fit into a 2nd cell.
   *    112 bit allows for 10^15 eth
   *    48 bit for full timestamp
   *    32 bit allows 150 years for unstake delay
   */
  struct DexDepositInfo {
    bool isValid;
    uint256 amount;
    // Store when a user deposited the token lastly.
    uint lastDepositBlockNo;
    // The deposit index of the same block.
    // If the deposit is only once in a block, it would be 0.
    uint lastDepositBlockNoIdx;
    // Store when a user withdrew the token lastly.
    uint lastWithdrawBlockNo;
    // The withdraw index of the same block.
    // If the deposit is only once in a block, it would be 0.
    uint lastWithdrawBlockNoIdx;
  }

  struct DexAccountValid {
    bool isInitialized;
    bool isValid;
  }

  /**
   * @dev `dexDeposits` has
   *    - an account address as the first key,
   *    - a unique token key string as the second key, and
   *    - `DexDepositInfo` as a value.
   *
   * e.g.
   *    - Alice (0xalice00) has 10 ETH == dexDeposits['0xalice00']['0:__native__:0'] = 10 * 1e18
   *    - Bill  (0xbill000) has 1 USDT == dexDeposits['0xbill000']['0:0xusdtAddr:0'] = 1 * 1e6
   *    - Carl  (0xcarl000) has 1 QWER == dexDeposits['0xcarl000']['0:0xqwer1155:0'] = 1 * 1e8
   */
  mapping(address => mapping(string => DexDepositInfo)) public dexAccounts;
  mapping(address => DexAccountValid) public dexAccountsValid;

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

  function _subDexToken(
    address toAccount,
    string memory tokenKey,
    uint256 amount
  ) internal returns (DexDepositInfo memory) {
    DexAccountValid memory accountValid = dexAccountsValid[toAccount];
    require(!accountValid.isInitialized || (accountValid.isInitialized && accountValid.isValid), 'account is invalid');

    DexDepositInfo storage ddi = dexAccounts[toAccount][tokenKey];
    require(ddi.amount >= amount, 'token balance is not enough');
    ddi.amount = ddi.amount - amount;
    return ddi;
  }

  function _addDexToken(
    address toAccount,
    string memory tokenKey,
    uint256 amount
  ) internal returns (DexDepositInfo storage) {
    DexAccountValid storage accountValid = dexAccountsValid[toAccount];

    require(!accountValid.isInitialized || (accountValid.isInitialized && accountValid.isValid), 'account is invalid');

    if (!accountValid.isInitialized) {
      accountValid.isInitialized = true;
    }
    if (!accountValid.isValid) {
      accountValid.isValid = true;
    }

    DexDepositInfo storage ddi = dexAccounts[toAccount][tokenKey];
    ddi.isValid = true;
    ddi.amount = ddi.amount + amount;
    return ddi;
  }

  function _depositDexToken(address fromAddr, address toAddr, string memory tokenKey, uint256 amount) private {
    /*
    require(amount <= type(uint112).max, 'deposit token amount overflow');
    */

    DexDepositInfo storage ddi = _addDexToken(toAddr, tokenKey, amount);

    // Set the last deposit time.
    uint blockNo = ddi.lastDepositBlockNo;
    if (blockNo != block.number) {
      ddi.lastDepositBlockNo = block.number;
      ddi.lastDepositBlockNoIdx = 0;
    } else {
      ddi.lastDepositBlockNoIdx++;
    }

    console.log(' >>>>> ', ddi.lastDepositBlockNo);

    emit DexAccountDeposited(fromAddr, toAddr, tokenKey, amount, ddi.amount);
  }

  function depositDexNativeToken(address account) public payable {
    _depositDexToken(msg.sender, account, DEX_TOKEN_NATIVE_TOKEN_KEY, msg.value);
  }

  /**
   * Deposit given token amount into given user account.
   * Anyone can send a token amount to given user account.
   * @param account user wallet address to receive given token amount
   * @param tokenKey unique token key string
   * @param amount deposit amount
   */
  function depositDexToken(address account, string memory tokenKey, uint256 amount) public payable {
    DexTokenInfo storage tokenInfo = dexTokens[tokenKey];

    require(tokenInfo.isValid, 'token is invalid');

    console.log('Token Type', tokenInfo.tokenType);
    console.log('Token Amount', amount);

    // native token
    if (tokenInfo.tokenType == 0) {
      depositDexNativeToken(account);
      return;
    }
    // ERC20
    else if (tokenInfo.tokenType == 1) {
      IWasd3rERC20 tokenContract = IWasd3rERC20(tokenInfo.contractAddress);

      uint256 allowAmount = tokenContract.allowance(account, address(this));
      require(allowAmount >= amount, 'Amount is not allowed in the ERC20 contract');

      bool success = tokenContract.transferFrom(account, address(this), amount);
      require(success, 'Fail to deposit ERC20 token');
    }
    // ERC1155
    else if (tokenInfo.tokenType == 2) {
      IWasd3rERC1155 tokenContract = IWasd3rERC1155(tokenInfo.contractAddress);
      tokenContract.safeTransferFrom(msg.sender, address(this), tokenInfo.tokenId, amount, '');
    }

    _depositDexToken(msg.sender, account, tokenKey, amount);
  }

  /**
   * Withdraw given token amount into given user withdraw account.
   * Only account owner can withdraw.
   * @param withdrawAddress user wallet address who receive the withdrawn token amount
   * @param tokenKey unique token key string
   * @param amount withdraw token amount
   */
  function withdrawDexToken(address withdrawAddress, string memory tokenKey, uint256 amount) public {
    DexAccountValid storage accountValid = dexAccountsValid[msg.sender];
    DexDepositInfo storage depositInfo = dexAccounts[msg.sender][tokenKey];
    DexTokenInfo storage tokenInfo = dexTokens[tokenKey];

    require(accountValid.isInitialized && accountValid.isValid, 'account is invalid');
    require(depositInfo.isValid, 'account token is invalid');
    require(depositInfo.amount >= amount, 'not enough deposit');

    depositInfo.amount = depositInfo.amount - amount;
    /*
    require(newAmount <= type(uint112).max, 'deposit token amount overflow');
    info.amount = uint112(newAmount);
    */

    // native token
    if (tokenInfo.tokenType == 0) {
      (bool success, ) = withdrawAddress.call{value: amount}('');
      require(success, 'fail to withdraw');
    }
    // ERC20
    else if (tokenInfo.tokenType == 1) {
      IWasd3rERC20 tokenContract = IWasd3rERC20(tokenInfo.contractAddress);
      bool success = tokenContract.transfer(withdrawAddress, amount);
      require(success, 'fail to deposit ERC20 token');
    }
    // ERC1155
    else if (tokenInfo.tokenType == 2) {
      IWasd3rERC1155 tokenContract = IWasd3rERC1155(tokenInfo.contractAddress);
      tokenContract.safeTransferFrom(address(this), withdrawAddress, tokenInfo.tokenId, amount, '');
    }

    // Set the last withdraw time.
    uint blockNo = depositInfo.lastWithdrawBlockNo;
    if (blockNo != block.number) {
      depositInfo.lastWithdrawBlockNo = block.number;
      depositInfo.lastWithdrawBlockNoIdx = 0;
    } else {
      depositInfo.lastWithdrawBlockNoIdx++;
    }

    emit DexAccountWithdrawn(msg.sender, withdrawAddress, tokenKey, amount, depositInfo.amount);
  }

  /**
   * Disable given account.
   * @param account user wallet address
   */
  function disableAccount(address account) public {
    require(dexAdmins[msg.sender] || msg.sender == account, 'Only admin or account owner can call this function');

    DexAccountValid storage accountValid = dexAccountsValid[account];
    accountValid.isInitialized = true;
    accountValid.isValid = false;
  }

  /**
   * Enable given account.
   * @param account user wallet address
   */
  function enableAccount(address account) public onlyDexAdmin {
    DexAccountValid storage accountValid = dexAccountsValid[account];
    accountValid.isInitialized = true;
    accountValid.isValid = true;
  }

  /**
   * Disable given account token deposit.
   * @param account user wallet address
   * @param tokenKey unique token key string
   */
  function disableAccountToken(address account, string memory tokenKey) public {
    require(dexAdmins[msg.sender] || msg.sender == account, 'Only admin or account owner can call this function');
    dexAccounts[account][tokenKey].isValid = false;
  }

  /**
   * Enable given account token deposit.
   * @param account user wallet address
   * @param tokenKey unique token key string
   */
  function enableAccountToken(address account, string memory tokenKey) public onlyDexAdmin {
    dexAccounts[account][tokenKey].isValid = true;
  }
}
