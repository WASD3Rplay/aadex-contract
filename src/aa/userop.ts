import { BigNumberish, BytesLike, Signer, ethers } from "ethers"
import { arrayify, defaultAbiCoder, keccak256 } from "ethers/lib/utils"

import { EthProvider } from "../eth"

export type address = string
export type uint256 = BigNumberish
export type uint = BigNumberish
export type uint48 = BigNumberish
export type bytes = BytesLike
export type bytes32 = BytesLike

export interface UserOperation {
  sender: address
  nonce: uint256
  initCode: bytes
  callData: bytes
  callGasLimit: uint256
  verificationGasLimit: uint256
  preVerificationGas: uint256
  maxFeePerGas: uint256
  maxPriorityFeePerGas: uint256
  paymasterAndData: bytes
  signature: bytes
}

export function packUserOp(userOp: UserOperation, forSignature = true): string {
  const initCode = keccak256(userOp.initCode)
  const callData = keccak256(userOp.callData)
  const paymasterAndData = keccak256(userOp.paymasterAndData)

  if (forSignature) {
    return defaultAbiCoder.encode(
      [
        "address",
        "uint256",
        "bytes32",
        "bytes32",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "bytes32",
      ],
      [
        userOp.sender,
        userOp.nonce,
        initCode,
        callData,
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        paymasterAndData,
      ],
    )
  } else {
    // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
    return defaultAbiCoder.encode(
      [
        "address",
        "uint256",
        "bytes",
        "bytes",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "bytes",
        "bytes",
      ],
      [
        userOp.sender,
        userOp.nonce,
        userOp.initCode,
        userOp.callData,
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        userOp.paymasterAndData,
        userOp.signature,
      ],
    )
  }
}

export function getUserOpHash(
  userOp: UserOperation,
  entryPoint: string,
  chainId: number,
): string {
  const userOpData = packUserOp(userOp, true)
  const userOpHash = keccak256(userOpData)
  const enc = defaultAbiCoder.encode(
    ["bytes32", "address", "uint256"],
    [userOpHash, entryPoint, chainId],
  )
  const encHash = keccak256(enc)
  return encHash
}

export const DefaultUserOp: UserOperation = {
  sender: ethers.constants.AddressZero,
  nonce: 0,
  initCode: "0x",
  callData: "0x",
  callGasLimit: 0,
  verificationGasLimit: 150000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
  preVerificationGas: 21000, // should also cover calldata cost.
  maxFeePerGas: 0,
  maxPriorityFeePerGas: 1e9,
  paymasterAndData: "0x",
  signature: "0x",
}

export function fillUserOpDefaults(
  userOp: Partial<UserOperation>,
  defaultUserOp = DefaultUserOp,
): UserOperation {
  const partialUserOp: any = { ...userOp }

  // we want "item:undefined" to be used from defaults, and not override defaults, so we must explicitly
  // remove those so "merge" will succeed.
  for (const key in partialUserOp) {
    if (partialUserOp[key] == null) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete partialUserOp[key]
    }
  }

  const filled = { ...defaultUserOp, ...partialUserOp }
  return filled
}

export function calculateDataCost(data: string): number {
  return ethers.utils
    .arrayify(data)
    .map((x) => (x === 0 ? 4 : 16))
    .reduce((sum, x) => sum + x)
}

export async function fillUserOp(
  ethProvider: EthProvider,
  entryPointAddress: string,
  partialUserOp: Partial<UserOperation>,
): Promise<UserOperation> {
  const rawUserOp = { ...partialUserOp }

  // `initCode` isn't needed for Dex
  // because Dex always use `DexManager` address as a sender address.
  // `verificationGasLimit` should be set to reduce estimating gas multiple times.

  // `nonce` should be set to reduce calling `getNonce` multiple times.

  // callGasLimit
  if (rawUserOp.callGasLimit == null && partialUserOp.callData != null) {
    const provider = ethProvider.provider
    if (provider == null)
      throw new Error("must have entryPoint for callGasLimit estimate")

    const gasEtimated = await provider.estimateGas({
      from: entryPointAddress,
      to: rawUserOp.sender,
      data: rawUserOp.callData,
    })

    // estimateGas assumes direct call from entryPoint. add wrapper cost.
    rawUserOp.callGasLimit = gasEtimated // .add(55000)
  }

  // `maxPriorityFeePerGas` and `maxFeePerGas` should be set
  // to reduce calling `getBlock` multiple times.

  const userOp = fillUserOpDefaults(rawUserOp)
  if (userOp.preVerificationGas.toString() === "0") {
    userOp.preVerificationGas = calculateDataCost(packUserOp(userOp, false))
  }

  return userOp
}

export async function fillAndSign(
  ethProvider: EthProvider,
  chainId: number,
  entryPointAddress: string,
  signer: Signer,
  partialUserOp: Partial<UserOperation>,
): Promise<UserOperation> {
  const userOp = await fillUserOp(ethProvider, entryPointAddress, partialUserOp)

  const userOpHash = getUserOpHash(userOp, entryPointAddress, chainId)
  const message = arrayify(userOpHash)

  const userOpSig = await signer.signMessage(message)

  return {
    ...userOp,
    signature: userOpSig,
  }
}
