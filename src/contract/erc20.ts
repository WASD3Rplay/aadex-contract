import { BigNumber, Wallet, ethers } from "ethers"

import { SampleErc20__factory } from "../contract/types"
import { EthProvider, TxContractReceipt } from "../eth"

export const deployERC20Contract = async (
  ethProvider: EthProvider,
  signer: Wallet,
  contractFactoryClass: any,
): Promise<ERC20ContractCtrl> => {
  const contract = await new contractFactoryClass(signer).deploy()
  await contract.deployed()

  return new ERC20ContractCtrl(
    ethProvider,
    contract.address,
    signer,
    contractFactoryClass,
  )
}

export const getERC20ContractCtrl = async (
  ethProvider: EthProvider,
  signer: Wallet,
  contractAddr?: string,
  contractFactoryClass?: any,
): Promise<ERC20ContractCtrl> => {
  if (contractAddr === undefined) {
    return await deployERC20Contract(ethProvider, contractFactoryClass, signer)
  }

  return new ERC20ContractCtrl(ethProvider, contractAddr, signer, contractFactoryClass)
}

export class ERC20ContractCtrl {
  contract: any
  decimals: number = 0

  constructor(
    readonly ethProvider: EthProvider,
    readonly contractAddress: string,
    readonly signer: Wallet,
    readonly contractFactoryClass: any = SampleErc20__factory,
  ) {
    this.contract = this.contractFactoryClass.connect(this.contractAddress, this.signer)
  }

  getNewContract = (signer: Wallet): any => {
    // eslint-disable-next-line new-cap
    return new ERC20ContractCtrl(
      this.ethProvider,
      this.contractAddress,
      signer,
      this.contractFactoryClass,
    )
  }

  setName = async (name: string): Promise<TxContractReceipt> => {
    const tx = await this.contract.setName(name)
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  getName = async (): Promise<string> => {
    return await this.contract.name()
  }

  setSymbol = async (symbol: string): Promise<TxContractReceipt> => {
    const tx = await this.contract.setSymbol(symbol)
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  getSymbol = async (): Promise<string> => {
    return await this.contract.symbol()
  }

  approve = async (
    toAddress: string,
    amount: string | number | BigNumber,
  ): Promise<TxContractReceipt> => {
    if (typeof amount === "string") {
      amount = Number(ethers.utils.parseUnits(amount, await this.getDecimals()))
    }

    const tx = await this.contract.approve(toAddress, amount)
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  getDecimals = async (): Promise<number> => {
    if (this.decimals === 0) {
      this.decimals = await this.contract.decimals()
    }
    return this.decimals
  }

  balanceOf = async (address: string): Promise<string> => {
    const balance = await this.contract.balanceOf(address)
    const decimals = await this.getDecimals()
    return ethers.utils.formatUnits(balance, decimals)
  }

  mintToken = async (
    toAddress: string,
    amount: string | number | BigNumber,
  ): Promise<TxContractReceipt> => {
    if (typeof amount === "string") {
      amount = ethers.utils.parseUnits(amount, await this.getDecimals())
    }

    const tx = await this.contract.mint(toAddress, amount)
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  transferToken = async (
    toAddr: string,
    amount: string | number | BigNumber,
  ): Promise<TxContractReceipt> => {
    if (typeof amount === "string") {
      amount = Number(ethers.utils.parseUnits(amount, await this.getDecimals()))
    }

    const tx = await this.contract.transfer(toAddr, amount)
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }
}
