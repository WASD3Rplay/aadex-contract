// SPDX-License-Identifier: MIT
// AADex Contracts (v0.2.0)

pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */

/// @title AADexAccessControl manages superuser and admin accounts.
/// @author Aaron aaron@wasd3r.xyz @aaronbbabam
abstract contract AADexAccessControl {
  /* ------------------------------------------------------------------------------------------------------------------
   * External variables
   */

  /// @notice Superuser of AA Dex Manager who can call CRITICAL and ESSENTIAL functions.
  address public superuser;

  /// @notice Admin accounts of AA Dex Manager who can call ESSENTIAL functions.
  mapping(address => bool) public admins;

  /* ------------------------------------------------------------------------------------------------------------------
   * Initialize
   */

  /// Interval variable to set whether this contract is initialized or not.
  bool private _isAcInit;

  /// Initialize this access control contract.
  function initDexAc() internal {
    require(!_isAcInit, 'The contract is already initialized');
    superuser = msg.sender;
    admins[msg.sender] = true;
    _isAcInit = true;
  }

  /* -------------------------------------------------------------------------------------------------------------------
   * Requires
   */

  modifier dexCritical() {
    require(msg.sender == superuser, 'Only the superuser can call this function');
    _;
  }

  modifier dexEssential() {
    require(superuser == msg.sender || admins[msg.sender], 'Only the superuser or admin can call this function');
    _;
  }

  /* -------------------------------------------------------------------------------------------------------------------
   * Add/Delete Admins
   */

  /// Event when a new admin is added.
  /// @param admin new admin account
  /// @param byWhom this action is triggered by whom
  event DexAcAdminAdded(address indexed admin, address indexed byWhom);

  /// Add a new admin account.
  /// @param admin new admin account
  function addAdmin(address admin) public dexCritical {
    admins[admin] = true;
    emit DexAcAdminAdded(admin, msg.sender);
  }

  /// Event when a target admin is deleted.
  /// @param admin target admin account
  /// @param byWhom this action is triggered by whom
  event DexAcAdminDeleted(address indexed admin, address indexed byWhom);

  /// Delete an admin account.
  /// @param admin the target admin account to delete
  function deleteAdmin(address admin) public dexCritical {
    admins[admin] = false;
    emit DexAcAdminDeleted(admin, msg.sender);
  }

  /* -------------------------------------------------------------------------------------------------------------------
   * Replace Superuser
   */

  /// Requested new superuser account.
  address public _newSu;

  /// Requested accounts who agree to replace `superuser` with `reqNewSu`.
  address[] public _newSuReqs;

  /// Event when a new superuser is initially requested.
  /// @param req account who requests to replace
  event DexAcReplaceSuRequestResetted(address indexed req);

  /// Event when superuser is replaced.
  /// @param oldSu previous superuser account
  /// @param newSu new superuser account
  event DexAcSuReplaced(address indexed oldSu, address indexed newSu);

  /// Event when a superuser replacement is requested.
  /// @param req account who requests to replace
  /// @param numOfReqs number of requesters
  event DexAcReplaceSuRequested(address indexed req, uint256 numOfReqs);

  /// Request to replace the superuser with a new superuser account.
  /// @param su new superuser account
  function requestToReplaceSu(address su) public dexEssential {
    if (_newSu != su) {
      delete _newSuReqs;
      emit DexAcReplaceSuRequestResetted(msg.sender);
    }

    for (uint i = 0; i < _newSuReqs.length; i++) {
      if (_newSuReqs[i] == msg.sender) {
        // The requester already requested before. Do nothing.
        return;
      }
    }

    // Replace superuser when the number of requester is more than 2.
    if (_newSuReqs.length > 2) {
      address prevSu = superuser;
      superuser = su;
      delete _newSuReqs;
      emit DexAcSuReplaced(prevSu, superuser);
      return;
    }

    _newSu = su;
    _newSuReqs.push(msg.sender);
    emit DexAcReplaceSuRequested(msg.sender, _newSuReqs.length);
  }

  /// Reset the superuser replacement requesters.
  function resetReplaceSuRequest() public dexEssential {
    delete _newSuReqs;
    emit DexAcReplaceSuRequestResetted(msg.sender);
  }
}
