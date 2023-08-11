import { BigNumber, BytesLike, Wallet, ethers } from "ethers"

import { getChainRpcUrl } from "../config"

export class EthProvider {
  public provider

  constructor(provider: any) {
    this.provider = provider
  }

  getChainId = async (): Promise<number> => {
    const network = await this.getNetwork()
    return network.chainId
  }

  getBlockNumber = async (): Promise<number> => {
    return this.provider.getBlockNumber()
  }

  getBalance = async (addr: string): Promise<string> => {
    const balance = await this.provider.getBalance(addr)
    return ethers.utils.formatEther(balance)
  }

  getNetwork = async (): Promise<any> => {
    return await this.provider.getNetwork()
  }

  getGasLimit = async (
    from: string,
    to: string,
    data: BytesLike,
  ): Promise<BigNumber> => {
    return await this.provider.estimateGas({
      from,
      to,
      data,
    })
  }

  getBaseFeePerGas = async (): Promise<BigNumber> => {
    const block = await this.provider.getBlock("latest")
    return block.baseFeePerGas
  }

  getWallet = (addressOrIndex?: string | number): Wallet => {
    return this.provider.getSigner(addressOrIndex)
  }

  loadWallet = (privateKey: string): Wallet => {
    return new Wallet(privateKey, this.provider)
  }

  loadWalletFromMnemonic = (mnemonic: string): Wallet => {
    return Wallet.fromMnemonic(mnemonic).connect(this.provider)
  }
}

export const getEthProvider = (url?: any): EthProvider => {
  if (url === undefined) {
    url = getChainRpcUrl()
  }

  return new EthProvider(new ethers.providers.JsonRpcProvider(url))
}
