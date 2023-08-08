// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.12;

import './Wasd3rDexAccountManager.sol';

import 'hardhat/console.sol';

/* solhint-disable avoid-low-level-calls */
/* solhint-disable not-rely-on-time */
/**
 * @title Wasd3rDexManager - manages Wasd3r Dex overall.
 */
contract Wasd3rDexManager is Wasd3rDexAccountManager {
  constructor() {
    initDexAccountManager();
  }

  receive() external payable {
    depositDexNativeToken(msg.sender);
  }
}
