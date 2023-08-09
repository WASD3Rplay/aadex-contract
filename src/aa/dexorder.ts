import { BigNumberish, Wallet, ethers } from "ethers"
import { arrayify, defaultAbiCoder, keccak256 } from "ethers/lib/utils"

export enum DexOrderType {
  BUY = 0,
  SELL = 1,
}

export const getDexOrderData = (
  chainId: number,
  dexManagerContractAddress: string,
  orderType: DexOrderType,
  baseTickerContractAddress: string,
  quoteTickerContractAddress: string,
  price: BigNumberish,
  requestAmount: BigNumberish,
): Uint8Array => {
  const packedDexOrder = defaultAbiCoder.encode(
    ["uint256", "address", "address", "uint256", "uint256"],
    [
      orderType,
      baseTickerContractAddress,
      quoteTickerContractAddress,
      price,
      requestAmount,
    ],
  )
  const packedDexOrderHash = keccak256(packedDexOrder)
  const packedCallData = defaultAbiCoder.encode(
    ["bytes32", "address", "uint256"],
    [packedDexOrderHash, dexManagerContractAddress, chainId],
  )
  const packedCallDataHash = keccak256(packedCallData)
  return arrayify(packedCallDataHash)
}

export const createNSignDexOrder = async (
  chainId: number,
  dexManagerContractAddress: string,
  signer: Wallet,
  orderId: number,
  orderType: DexOrderType,
  baseTickerContractAddress: string,
  quoteTickerContractAddress: string,
  price: BigNumberish,
  requestAmount: BigNumberish,
): Promise<any> => {
  // `orderId` is not included for signature.
  const dexOrderData = getDexOrderData(
    chainId,
    dexManagerContractAddress,
    orderType,
    baseTickerContractAddress,
    quoteTickerContractAddress,
    price,
    requestAmount,
  )
  const signature = await signer.signMessage(dexOrderData)

  const addr = ethers.utils.verifyMessage(dexOrderData, signature)
  console.debug(">>>>>", addr)

  const dexOrder = {
    orderId,
    orderType,
    baseTokenAddr: baseTickerContractAddress,
    quoteTokenAddr: quoteTickerContractAddress,
    price,
    requestAmount,
    signature,
  }

  return dexOrder
}
