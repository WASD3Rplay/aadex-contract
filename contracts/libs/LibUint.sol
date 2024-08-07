// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.20;

import '@openzeppelin/contracts/utils/Strings.sol';

library LibUint {
  function uint256ToString(uint256 value) internal pure returns (string memory) {
    if (value == 0) {
      return '0';
    }

    uint256 temp = value;
    uint256 digits;

    while (temp != 0) {
      digits++;
      temp /= 10;
    }

    bytes memory buffer = new bytes(digits);
    uint256 index = digits - 1;

    while (value != 0) {
      buffer[index--] = bytes1(uint8(48 + (value % 10)));
      value /= 10;
    }

    return string(buffer);
  }

  function uint8ToString(uint8 value) internal pure returns (string memory) {
    return Strings.toString(value);
  }
}
