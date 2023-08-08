// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */
/**
 * @title Wasd3rDexAC - Access control for Wasd3r Dex functions.
 */
abstract contract Wasd3rDexAccessControl {
  bool private _isAcInit;

  /**
   * @notice Superuser of Wasd3r Dex Manager who can call superuser functions.
   */
  address public requestedNewSu;
  address[] public replaceSuRequesters;

  event DexAcReplaceSuRequested(address indexed requester, uint256 numOfRequesters);
  event DexAcReplaceSuRequestResetted(address indexed requester);
  event DexAcSuReplaced(address indexed oldSu, address indexed newSu);

  /**
   * @notice Superuser of Wasd3r Dex Manager who can call superuser functions.
   */
  address public dexSuperuser;

  modifier onlyDexSu() {
    require(msg.sender == dexSuperuser, 'Only the superuser can call this function');
    _;
  }

  event DexAcAdminAdded(address indexed admin, address indexed byWhom);
  event DexAcAdminDeleted(address indexed admin, address indexed byWhom);

  /**
   * @notice Admin list of Wasd3r Dex Manager who can call admin functions.
   */
  mapping(address => bool) public dexAdmins;

  modifier onlyDexAdmin() {
    require(dexAdmins[msg.sender], 'Only the admin can call this function');
    _;
  }

  modifier onlyDexSuOrAdmin() {
    require(dexSuperuser == msg.sender || dexAdmins[msg.sender], 'Only the superuser or admin can call this function');
    _;
  }

  /**
   * (internal) Initialize this access control (AC) contract.
   */
  function initDexAc() internal {
    require(!_isAcInit, 'The contract is already initialized');
    dexSuperuser = msg.sender;
    dexAdmins[msg.sender] = true;
  }

  /**
   * (SU or ADMIN) Request to replace supseruser.
   * @param su new superuser address to replace
   */
  function requestToReplaceSu(address su) public onlyDexSuOrAdmin {
    if (requestedNewSu != su) {
      delete replaceSuRequesters;
      emit DexAcReplaceSuRequestResetted(msg.sender);
    }

    for (uint i = 0; i < replaceSuRequesters.length; i++) {
      if (replaceSuRequesters[i] == msg.sender) {
        return;
      }
    }

    // Reset superuser when the number of requester is more than 2.
    if (replaceSuRequesters.length + 1 == 2) {
      address prevSu = dexSuperuser;
      dexSuperuser = su;
      delete replaceSuRequesters;
      emit DexAcSuReplaced(prevSu, dexSuperuser);
      return;
    }

    requestedNewSu = su;
    replaceSuRequesters.push(msg.sender);
    emit DexAcReplaceSuRequested(msg.sender, replaceSuRequesters.length);
  }

  /**
   * (SU or ADMIN) Reset all requests before to replace supseruser.
   */
  function resetReplaceSuRequest() public onlyDexSuOrAdmin {
    delete replaceSuRequesters;
    emit DexAcReplaceSuRequestResetted(msg.sender);
  }

  /**
   * (SU) Add a new admin.
   * @param admin admin wallet address
   */
  function addAdmin(address admin) public onlyDexSu {
    dexAdmins[admin] = true;
    emit DexAcAdminAdded(admin, msg.sender);
  }

  /**
   * (SU or ADMIN) Delete admin.
   * @param admin admin wallet address
   */
  function deleteAdmin(address admin) public onlyDexSuOrAdmin {
    dexAdmins[admin] = false;
    emit DexAcAdminDeleted(admin, msg.sender);
  }
}
