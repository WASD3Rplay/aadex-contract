// SPDX-License-Identifier: MIT
// AADex Contracts (v0.2.0)

pragma solidity ^0.8.12;

import './AADexTokenManager.sol';

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */

/// @title AADexAccountManager manages the quantity of each token for all users managed by AADex.
/// @author Aaron aaron@wasd3r.xyz @aaronbbabam
abstract contract AADexAccountManager is AADexTokenManager {
  /* ------------------------------------------------------------------------------------------------------------------
   * Structs
   */

  /// @notice Deposit information structure of a token for a user account
  /// @param amount the user deposited token amount
  /// @param lastDepositBlockNo the block number when a user deposited the token lastly
  /// @param lastDepositBlockNoIdx deposit index in the same block of the last deposit. If only once, it would be 0.
  /// @param lastWithdrawtBlockNo the block number when a user withdrew the token lastly
  /// @param lastWithdrawBlockNoIdx withdraw index in the same block of the last withdraw. If onle once, it would be 0.
  struct DexDepositInfo {
    uint256 amount;
    uint lastDepositBlockNo;
    uint lastDepositBlockNoIdx;
    uint lastWithdrawBlockNo;
    uint lastWithdrawBlockNoIdx;
  }

  /// @notice Account status structure of a user account
  /// @param isInitialized the account is initialized or not
  /// @param isValid the account is valid or invalid
  struct DexAccountValid {
    bool isInitialized;
    bool isValid;
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * External variables
   */

  /// @notice Map that stores a deposit map with an account address as the key.
  ///         The deposit map is with `TokenKey` as the key.
  mapping(address => mapping(string => DexDepositInfo)) public dexAccounts;

  /// @notice Map that stores an account status with the account address as the key.
  mapping(address => DexAccountValid) public dexAccountsValid;

  /* ------------------------------------------------------------------------------------------------------------------
   * Initialize
   */

  /// Initialize this account manager contract.
  function initDexAccountManager() internal {
    initDexTokenManager();
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Increase/Decrease token amount
   */

  /// Increase the amount in the deposit info of the token by `tKey` for the account by `to`.
  /// @param to target account address
  /// @param tKey target token key
  /// @param amount token amount to increase
  function _increaseDexTokenAmount(
    address to,
    string memory tKey,
    uint256 amount
  ) internal returns (DexDepositInfo storage) {
    DexAccountValid memory dav = dexAccountsValid[to];
    require(!dav.isInitialized || (dav.isInitialized && dav.isValid), 'Deposit account is invalid to increase');

    if (!dav.isInitialized) {
      DexAccountValid storage sdav = dexAccountsValid[to];
      sdav.isInitialized = true;
      sdav.isValid = true;
    }

    DexDepositInfo storage ddi = dexAccounts[to][tKey];
    ddi.amount = ddi.amount + amount;
    return ddi;
  }

  /// Decrease the amount in the deposit info of the token by `tKey` for the account by `from`.
  /// @param from target account address
  /// @param tKey target token key
  /// @param amount token amount to decrease
  function _decreaseDexTokenAmount(
    address from,
    string memory tKey,
    uint256 amount
  ) internal returns (DexDepositInfo storage) {
    DexAccountValid memory dav = dexAccountsValid[from];
    require(!dav.isInitialized || (dav.isInitialized && dav.isValid), 'Deposit account is invalid to decrease');

    DexDepositInfo storage ddi = dexAccounts[from][tKey];
    require(ddi.amount >= amount, 'Deposit amount is less than the input amount to decrease');

    ddi.amount = ddi.amount - amount;
    return ddi;
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Deposit token
   */

  /// Event when a token is depositted.
  /// @param from address from which the token was transferred
  /// @param to address to which the token was transferred
  /// @param tokenKey target token key
  /// @param amount deposit amount
  /// @param total total amount after deposit
  event DexAccountDeposited(address indexed from, address indexed to, string tokenKey, uint256 amount, uint256 total);

  function _depositDexToken(address from, address to, string memory tKey, uint256 amount) private {
    DexDepositInfo storage ddi = _increaseDexTokenAmount(to, tKey, amount);

    // Set the last deposit time.
    uint blockNo = ddi.lastDepositBlockNo;
    if (blockNo != block.number) {
      ddi.lastDepositBlockNo = block.number;
      ddi.lastDepositBlockNoIdx = 0;
    } else {
      ddi.lastDepositBlockNoIdx++;
    }

    emit DexAccountDeposited(from, to, tKey, amount, ddi.amount);
  }

  /// Deposit the TX message value into the deposit info of the native token for the account by `to`.
  /// @param to target account address
  function depositDexNativeToken(address to) public payable {
    _depositDexToken(msg.sender, to, DEX_TOKEN_NATIVE_TOKEN_KEY, msg.value);
  }

  /// Deposit given token amount into the deposit info of the tokey by `tKey` for the account by `to`.
  /// @param to target account address
  /// @param tKey target token key
  /// @param amount deposit amount. When the token is native, this value will be ignored.
  function depositDexToken(address to, string memory tKey, uint256 amount) public payable {
    DexTokenInfo storage dti = dexTokens[tKey];
    require(dti.isValid, 'token is invalid to deposit');

    require(msg.sender == to || admins[msg.sender], 'Only admin or owner can call this function');

    if (dti.tokenType == 0) {
      // native token (e.g. ETH)

      depositDexNativeToken(to);
      return;
    } else if (dti.tokenType == 1) {
      // ERC20 token

      IWasd3rERC20 tokenContract = IWasd3rERC20(dti.contractAddress);

      uint256 allow = tokenContract.allowance(to, address(this));
      require(allow == amount, 'Amount is not allowed in the ERC20 contract');

      bool success = tokenContract.transferFrom(to, address(this), amount);
      require(success, 'Fail to deposit ERC20 token');
    } else {
      require(false, 'Unsupported token type');
    }

    // When the message sender sends native token accidently,
    if (msg.value > 0) {
      depositDexNativeToken(to);
    }

    _depositDexToken(msg.sender, to, tKey, amount);
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Withdraw token
   */

  /// Event when a token is withdrew.
  /// @param from address from which the token was transferred
  /// @param to address to which the token was transferred
  /// @param tokenKey target token key
  /// @param amount withdraw amount
  /// @param total total amount after withdraw
  event DexAccountWithdrawn(address indexed from, address indexed to, string tokenKey, uint256 amount, uint256 total);

  /// Withdraw given token amount from the deposit info of the token by `tKey` for the account by `msg.sender`.
  /// Only account owner can withdraw.
  /// @param tKey target token key
  /// @param amount request amount to withdraw
  function withdrawDexToken(string memory tKey, uint256 amount) public {
    require(amount > 0, 'Amount should be bigger than zero');

    _decreaseDexTokenAmount(msg.sender, tKey, amount);

    DexTokenInfo storage dti = dexTokens[tKey];

    if (dti.tokenType == 0) {
      // native token (e.g. ETH)

      // To avoid Re-Entrancy attack
      // https://docs.soliditylang.org/en/v0.4.21/security-considerations.html#re-entrancy
      payable(msg.sender).transfer(amount);
    } else if (dti.tokenType == 1) {
      // ERC20 token

      IWasd3rERC20 tokenContract = IWasd3rERC20(dti.contractAddress);
      bool success = tokenContract.transfer(msg.sender, amount);
      require(success, 'Fail to deposit ERC20 token');
    } else {
      require(false, 'Unsupported token type');
    }

    // Set the last withdraw time.
    DexDepositInfo storage ddi = dexAccounts[msg.sender][tKey];
    uint blockNo = ddi.lastWithdrawBlockNo;
    if (blockNo != block.number) {
      ddi.lastWithdrawBlockNo = block.number;
      ddi.lastWithdrawBlockNoIdx = 0;
    } else {
      ddi.lastWithdrawBlockNoIdx++;
    }

    emit DexAccountWithdrawn(msg.sender, msg.sender, tKey, amount, ddi.amount);
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Enable/Disable account
   */

  /// Event when an account is disabled.
  /// @param addr target account address
  /// @param byWhom this action is triggered by whom
  event DexAccountDisabled(address indexed addr, address indexed byWhom);

  /// Event when an account is enabled.
  /// @param addr target account address
  /// @param byWhom this action is triggered by whom
  event DexAccountEnabled(address indexed addr, address indexed byWhom);

  /// Disable given account.
  /// @param account account address
  function disableAccount(address account) public {
    require(admins[msg.sender] || msg.sender == account, 'Only admin or owner can call this function');

    DexAccountValid storage dav = dexAccountsValid[account];
    dav.isInitialized = true;
    dav.isValid = false;

    emit DexAccountDisabled(account, msg.sender);
  }

  /// Enable given account.
  /// @param account account address
  function enableAccount(address account) public dexEssential {
    DexAccountValid storage dav = dexAccountsValid[account];
    dav.isInitialized = true;
    dav.isValid = true;

    emit DexAccountEnabled(account, msg.sender);
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * Public Views
   */

  /// Return `DexDepositInfo` of given account address and token key.
  /// @param account account address
  /// @param tKey target token key
  function getDexDepositInfo(address account, string memory tKey) public view returns (DexDepositInfo memory info) {
    return dexAccounts[account][tKey];
  }

  /// Return account's native token amount.
  /// @param account account address
  function getDexNativeBalanceOf(address account) public view returns (uint256) {
    return dexAccounts[account][DEX_TOKEN_NATIVE_TOKEN_KEY].amount;
  }

  /// Return account's token amount.
  /// @param account account address
  /// @param tKey target token key
  function getDexBalanceOf(address account, string memory tKey) public view returns (uint256) {
    return dexAccounts[account][tKey].amount;
  }
}
