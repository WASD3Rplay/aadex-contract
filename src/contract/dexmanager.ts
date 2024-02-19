import { BigNumber, Signer, Wallet, ethers } from "ethers"

import { getDexManagerAddress, getEntryPointAddress, getSignerSecret } from "../config"
import { EthProvider, TxContractReceipt, getEthProvider } from "../eth"

import { AADexAccountManager, AADexManager, AADexManager__factory } from "./types"

export const depositEth = async (
  depositAmount: string,
  depositAccount?: string,
  tokenOwnerSecret?: string,
  entryPointContractAddr?: string,
  dexManagerContractAddr?: string,
): Promise<{ ctrl: DexManagerContractCtrl; txreceipt: TxContractReceipt }> => {
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
): Promise<{ ctrl: DexManagerContractCtrl; txreceipt: TxContractReceipt }> => {
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
): Promise<{ ctrl: DexManagerContractCtrl; contract: any }> => {
  const contract = await new AADexManager__factory(signer).deploy()
  await contract.deployed()
  await (await contract.setEntryPoint(entryPointContractAddr)).wait()

  return {
    ctrl: new DexManagerContractCtrl(ethProvider, contract.address, signer),
    contract,
  }
}

export const getDexManagerContractCtrl = async (
  ethProvider: EthProvider,
  signer: Signer,
  entryPointContractAddr: string,
  dexManagerContractAddr?: string,
): Promise<DexManagerContractCtrl> => {
  if (dexManagerContractAddr === undefined || dexManagerContractAddr.length === 0) {
    const ret = await deployDexManager(ethProvider, signer, entryPointContractAddr)
    return ret.ctrl
  }
  return new DexManagerContractCtrl(ethProvider, dexManagerContractAddr, signer)
}

export class DexManagerContractCtrl {
  contract: AADexManager

  constructor(
    readonly ethProvider: EthProvider,
    readonly contractAddress: string,
    readonly signer: Signer,
  ) {
    this.contract = AADexManager__factory.connect(contractAddress, this.signer)
  }

  getNewContract = (signer: Signer): DexManagerContractCtrl => {
    return new DexManagerContractCtrl(this.ethProvider, this.contractAddress, signer)
  }

  getNonce = async (): Promise<number> => {
    const nonce = await this.contract.getNonce()
    return Number(nonce)
  }

  getSU = async (): Promise<string> => {
    return await this.contract.superuser()
  }

  addAdmin = async (adminAddr: string): Promise<TxContractReceipt> => {
    const tx = await this.contract.addAdmin(adminAddr)
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  isAdmin = async (adminAddr: string): Promise<boolean> => {
    return await this.contract.admins(adminAddr)
  }

  getNativeTokenKey = async (): Promise<string> => {
    return await this.contract.DEX_TOKEN_NATIVE_TOKEN_KEY()
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
    const tokenInfo = await this.contract.dexTokens(tokenKey)
    return tokenInfo
  }

  isValidDexToken = async (tokenKey: string): Promise<boolean> => {
    return (await this.contract.dexTokens(tokenKey)).isValid
  }

  registerDexToken = async (
    tokenType: 0 | 1 | 2, // native:0, ERC20:1, ERC1155:2
    tokenAddr: string,
    tokenName: string,
    tokenDecimals: number,
    tokenId = 0,
  ): Promise<TxContractReceipt> => {
    const tx = await this.contract.registerDexToken(
      tokenType,
      tokenAddr,
      tokenId,
      tokenDecimals,
      tokenName,
    )
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  depositNativeToken = async (
    depositAccount: string,
    value?: string | number | BigNumber,
  ): Promise<TxContractReceipt> => {
    if (value !== undefined && typeof value === "string") {
      value = ethers.utils.parseEther(value)
    }

    const tokenKey = await this.getNativeTokenKey()

    const tx = await this.contract.depositDexToken(depositAccount, tokenKey, 0, {
      value,
    })
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  depositDexToken = async (
    depositAccount: string,
    tokenKey: string,
    amount: number | BigNumber,
    value?: string | number | BigNumber,
  ): Promise<TxContractReceipt> => {
    if (value !== undefined && typeof value === "string") {
      value = ethers.utils.parseEther(value)
    }

    const tx = await this.contract.depositDexToken(depositAccount, tokenKey, amount, {
      value,
    })
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  withdrawDexToken = async (
    tokenKey: string,
    amount: number | BigNumber,
  ): Promise<TxContractReceipt> => {
    const tx = await this.contract.withdrawDexToken(tokenKey, amount)
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  getDexNativeBalanceOf = async (addr: string): Promise<BigNumber> => {
    const balance = await this.contract.getDexNativeBalanceOf(addr)
    //return ethers.utils.formatEther(balance)
    return balance
  }

  getDexBalanceOf = async (addr: string, tokenKey: string): Promise<BigNumber> => {
    const balance = await this.contract.getDexBalanceOf(addr, tokenKey)
    //return ethers.utils.formatUnits(balance, tokenKey.split(":")[3])
    return balance
  }

  getDexDepositInfo = async (
    addr: string,
    tokenKey: string,
  ): Promise<AADexAccountManager.DexDepositInfoStructOutput> => {
    const depositInfo = await this.contract.getDexDepositInfo(addr, tokenKey)
    return depositInfo
  }

  getDexAccountValid = async (
    addr: string,
  ): Promise<[boolean, boolean] & { isInitialized: boolean; isValid: boolean }> => {
    const accountValid = await this.contract.dexAccountsValid(addr)
    return accountValid
  }

  enableAccount = async (addr: string): Promise<TxContractReceipt> => {
    const tx = await this.contract.enableAccount(addr)
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  disableAccount = async (addr: string): Promise<TxContractReceipt> => {
    const tx = await this.contract.disableAccount(addr)
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }
}
