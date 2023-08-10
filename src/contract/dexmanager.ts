import { BigNumber, Signer, Wallet, ethers } from "ethers"

import { getDexManagerAddress, getEntryPointAddress, getSignerSecret } from "../config"
import { ZERO_ADDRESS } from "../constants"
import { EthProvider, TxReceipt, getEthProvider } from "../eth"

import { Wasd3rDexManager, Wasd3rDexManager__factory } from "./types"

export const depositEth = async (
  depositAmount: string,
  depositAccount?: string,
  tokenOwnerSecret?: string,
  entryPointContractAddr?: string,
  dexManagerContractAddr?: string,
): Promise<{ ctrl: DexManagerContractCtrl; txreceipt: TxReceipt }> => {
  const ethProvider = getEthProvider()

  const entryPointContractAddress = entryPointContractAddr ?? getEntryPointAddress()
  const dexManagerContractAddress = dexManagerContractAddr ?? getDexManagerAddress()

  const ethOwnerWallet = new Wallet(
    tokenOwnerSecret ?? getSignerSecret(),
    ethProvider.provider,
  )

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    ethOwnerWallet,
    entryPointContractAddress,
    dexManagerContractAddress,
  )
  const ethTokenKey = await dexManagerContractCtrl.getNativeTokenKey()

  return {
    ctrl: dexManagerContractCtrl,
    txreceipt: await dexManagerContractCtrl.depositDexToken(
      depositAccount ?? ethOwnerWallet.address,
      ethTokenKey,
      0,
      ethers.utils.parseEther(depositAmount),
    ),
  }
}

export const depositToken = async (
  tokenContractAddress: string,
  depositAmount: string,
  depositAccount?: string,
  tokenKey?: string,
  tokenType: 0 | 1 | 2 = 1, // native:0, ERC20:1, ERC1155:2
  tokenDecimals: number = 6,
  tokenId: number = 0,
  tokenOwnerSecret?: string,
  entryPointContractAddr?: string,
  dexManagerContractAddr?: string,
): Promise<{ ctrl: DexManagerContractCtrl; txreceipt: TxReceipt }> => {
  const ethProvider = getEthProvider()

  const entryPointContractAddress = entryPointContractAddr ?? getEntryPointAddress()
  const dexManagerContractAddress = dexManagerContractAddr ?? getDexManagerAddress()

  const tokenOwnerWallet = new Wallet(
    tokenOwnerSecret ?? getSignerSecret(),
    ethProvider.provider,
  )

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    tokenOwnerWallet,
    entryPointContractAddress,
    dexManagerContractAddress,
  )
  tokenKey =
    tokenKey ??
    (await dexManagerContractCtrl.getTokenKey(
      tokenType,
      tokenContractAddress,
      tokenDecimals,
      tokenId,
    ))

  return {
    ctrl: dexManagerContractCtrl,
    txreceipt: await dexManagerContractCtrl.depositDexToken(
      depositAccount ?? tokenOwnerWallet.address,
      tokenKey,
      ethers.utils.parseUnits(depositAmount, tokenDecimals),
    ),
  }
}

export const deployDexManager = async (
  ethProvider: EthProvider,
  signer: Signer,
  entryPointContractAddr: string,
): Promise<DexManagerContractCtrl> => {
  const contract = await new Wasd3rDexManager__factory(signer).deploy()
  await (await contract.setEntryPoint(entryPointContractAddr)).wait()

  return new DexManagerContractCtrl(ethProvider, contract.address, signer)
}

export const getDexManagerContractCtrl = async (
  ethProvider: EthProvider,
  signer: Signer,
  entryPointContractAddr: string,
  dexManagerContractAddr?: string,
): Promise<DexManagerContractCtrl> => {
  if (dexManagerContractAddr === undefined || dexManagerContractAddr.length === 0) {
    return await deployDexManager(ethProvider, signer, entryPointContractAddr)
  }
  return new DexManagerContractCtrl(ethProvider, dexManagerContractAddr, signer)
}

export class DexManagerContractCtrl {
  contract: Wasd3rDexManager

  constructor(
    readonly ethProvider: EthProvider,
    readonly contractAddress: string,
    readonly signer: Signer,
  ) {
    this.contract = Wasd3rDexManager__factory.connect(contractAddress, this.signer)
  }

  getNewContract = (signer: Signer): DexManagerContractCtrl => {
    return new DexManagerContractCtrl(this.ethProvider, this.contractAddress, signer)
  }

  getNonce = async (): Promise<number> => {
    const nonce = await this.contract.getNonce()
    return Number(nonce)
  }

  addAdmin = async (adminAddr: string): Promise<TxReceipt> => {
    const tx = await this.contract.addAdmin(adminAddr)
    const receipt = await tx.wait()
    return new TxReceipt(receipt)
  }

  getNativeTokenKey = async (): Promise<string> => {
    const tokenKey = await this.getTokenKey(0, ZERO_ADDRESS, 0, 0)
    return tokenKey
  }

  getTokenKey = async (
    tokenType: 0 | 1 | 2, // native:0, ERC20:1, ERC1155:2
    tokenAddr: string,
    tokenDecimals: number,
    tokenId = 0,
  ): Promise<string> => {
    const tokenKey = await this.contract.getTokenKey(
      tokenType,
      tokenAddr,
      tokenId,
      tokenDecimals,
    )
    return tokenKey
  }

  getDexTokenInfo = async (tokenKey: string): Promise<any> => {
    const tokenInfo = await this.contract.getDexTokenInfo(tokenKey)
    return tokenInfo
  }

  registerDexToken = async (
    tokenType: 0 | 1 | 2, // native:0, ERC20:1, ERC1155:2
    tokenAddr: string,
    tokenName: string,
    tokenDecimals: number,
    tokenId = 0,
  ): Promise<TxReceipt> => {
    const tx = await this.contract.registerDexToken(
      tokenType,
      tokenAddr,
      tokenId,
      tokenDecimals,
      tokenName,
    )
    const receipt = await tx.wait()
    return new TxReceipt(receipt)
  }

  depositNativeToken = async (
    depositAccount: string,
    value?: string | number | BigNumber,
  ): Promise<TxReceipt> => {
    if (value !== undefined && typeof value === "string") {
      value = ethers.utils.parseEther(value)
    }

    const tokenKey = await this.getNativeTokenKey()

    const tx = await this.contract.depositDexToken(depositAccount, tokenKey, 0, {
      value,
    })
    const receipt = await tx.wait()
    return new TxReceipt(receipt)
  }

  depositDexToken = async (
    depositAccount: string,
    tokenKey: string,
    amount: number | BigNumber,
    value?: string | number | BigNumber,
  ): Promise<TxReceipt> => {
    if (value !== undefined && typeof value === "string") {
      value = ethers.utils.parseEther(value)
    }

    const tx = await this.contract.depositDexToken(depositAccount, tokenKey, amount, {
      value,
    })
    const receipt = await tx.wait()
    return new TxReceipt(receipt)
  }

  withdrawDexToken = async (
    withdrawAddr: string,
    tokenKey: string,
    amount: number,
  ): Promise<TxReceipt> => {
    const tx = await this.contract.withdrawDexToken(withdrawAddr, tokenKey, amount)
    const receipt = await tx.wait()
    return new TxReceipt(receipt)
  }

  getDexNativeBalanceOf = async (addr: string): Promise<string> => {
    const balance = await this.contract.getDexNativeBalanceOf(addr)
    return ethers.utils.formatEther(balance)
  }

  getDexBalanceOf = async (addr: string, tokenKey: string): Promise<string> => {
    const balance = await this.contract.getDexBalanceOf(addr, tokenKey)
    return ethers.utils.formatUnits(balance, tokenKey.split(":")[3])
  }
}
