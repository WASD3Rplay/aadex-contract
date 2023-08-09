// SPDX-License-Identifier: MIT
// Wasd3r Contracts (v0.1.0)

pragma solidity ^0.8.0;

library LibAddress {
  function toAsciiString(address account) internal pure returns (string memory) {
    bytes32 value = bytes32(uint256(uint160(account)));
    bytes memory alphabet = '0123456789abcdef';

    bytes memory str = new bytes(42);
    str[0] = '0';
    str[1] = 'x';

    for (uint256 i = 0; i < 20; i++) {
      str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
      str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
    }

    return string(str);
  }
}
