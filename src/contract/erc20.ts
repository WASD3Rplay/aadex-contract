import { BigNumber, Wallet, ethers } from "ethers"

import { EthProvider, TxReceipt } from "../eth"

export const deployWasd3rERC20Contract = async (
  contractFactoryClass: any,
  ethProvider: EthProvider,
  signer: Wallet,
): Promise<ERC20ContractCtrl> => {
  const contract = await new contractFactoryClass(signer).deploy()

  return new ERC20ContractCtrl(
    contractFactoryClass,
    ethProvider,
    contract.address,
    signer,
  )
}

export const getWasd3rERC20ContractCtrl = async (
  contractFactoryClass: any,
  ethProvider: EthProvider,
  signer: Wallet,
  contractAddr?: string,
): Promise<ERC20ContractCtrl> => {
  if (contractAddr === undefined) {
    return await deployWasd3rERC20Contract(ethProvider, contractFactoryClass, signer)
  }

  return new ERC20ContractCtrl(contractFactoryClass, ethProvider, contractAddr, signer)
}

export class ERC20ContractCtrl {
  contract: any
  decimals: number = 0

  constructor(
    readonly contractFactoryClass: any,
    readonly ethProvider: EthProvider,
    readonly contractAddress: string,
    readonly signer: Wallet,
  ) {
    this.contract = this.contractFactoryClass.connect(this.contractAddress, this.signer)
  }

  getNewContract = (signer: Wallet): any => {
    // eslint-disable-next-line new-cap
    return new ERC20ContractCtrl(
      this.contractFactoryClass,
      this.ethProvider,
      this.contractAddress,
      signer,
    )
  }

  approve = async (
    toAddress: string,
    amount: string | number | BigNumber,
  ): Promise<TxReceipt> => {
    if (typeof amount === "string") {
      amount = Number(ethers.utils.parseUnits(amount, await this.getDecimals()))
    }

    const tx = await this.contract.approve(toAddress, amount)
    const receipt = await tx.wait()
    return new TxReceipt(receipt)
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
  ): Promise<TxReceipt> => {
    if (typeof amount === "string") {
      amount = ethers.utils.parseUnits(amount, await this.getDecimals())
    }

    const tx = await this.contract.mint(toAddress, amount)
    const receipt = await tx.wait()
    return new TxReceipt(receipt)
  }

  transferToken = async (
    toAddr: string,
    amount: string | number | BigNumber,
  ): Promise<TxReceipt> => {
    if (typeof amount === "string") {
      amount = Number(ethers.utils.parseUnits(amount, await this.getDecimals()))
    }

    const tx = await this.contract.transfer(toAddr, amount)
    const receipt = await tx.wait()
    return new TxReceipt(receipt)
  }
}
