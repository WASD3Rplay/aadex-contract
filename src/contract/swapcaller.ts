import { BigNumber, Signer, ethers } from "ethers"

import { getDexManagerAddress, getEntryPointAddress } from "../config"
import { ZERO_ADDRESS } from "../constants"
import { EthProvider, TxContractReceipt, TxReceipt } from "../eth"

import { AADexSwapCaller, AADexSwapCaller__factory } from "./types"

export const deploySwapCaller = async (
  ethProvider: EthProvider,
  signer: Signer,
  entryPointContractAddress?: string,
  dexManagerContractAddress?: string,
): Promise<{ ctrl: SwapCallerContractCtrl; contract: any }> => {
  const contract = await new AADexSwapCaller__factory(signer).deploy(
    dexManagerContractAddress ?? getDexManagerAddress(),
    entryPointContractAddress ?? getEntryPointAddress(),
  )
  await contract.deployed()

  return {
    ctrl: new SwapCallerContractCtrl(ethProvider, contract.address, signer),
    contract: contract,
  }
}

export const getSwapCallerContractCtrl = async (
  ethProvider: EthProvider,
  signer: Signer,
  contractAddr?: string,
  entryPointContractAddress?: string,
  dexManagerContractAddress?: string,
): Promise<SwapCallerContractCtrl> => {
  if (contractAddr === undefined || contractAddr.length === 0) {
    const ret = await deploySwapCaller(
      ethProvider,
      signer,
      entryPointContractAddress,
      dexManagerContractAddress,
    )
    return ret.ctrl
  }
  return new SwapCallerContractCtrl(ethProvider, contractAddr, signer)
}

export class SwapCallerContractCtrl {
  contract: AADexSwapCaller

  constructor(
    readonly ethProvider: EthProvider,
    readonly contractAddress: string,
    readonly signer: Signer,
  ) {
    this.contract = AADexSwapCaller__factory.connect(contractAddress, this.signer)
  }

  getNewContract = (signer: Signer): SwapCallerContractCtrl => {
    return new SwapCallerContractCtrl(this.ethProvider, this.contractAddress, signer)
  }

  getNonce = async (): Promise<number> => {
    const nonce = await this.contract.getNonce()
    return Number(nonce)
  }

  getOwner = async (): Promise<string> => {
    return await this.contract.owner()
  }

  transferToken = async (
    tokenContractAddress: string,
    toAddress: string,
    amount: string | number | BigNumber,
    decimals: number | BigNumber,
  ): Promise<TxReceipt> => {
    if (typeof amount === "string") {
      amount = ethers.utils.parseUnits(amount, decimals)
    }

    const tx = await this.contract.transferToken(
      tokenContractAddress,
      toAddress,
      amount,
    )
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  transferEth = async (
    toAddress: string,
    amount: string | number | BigNumber,
  ): Promise<TxReceipt> => {
    if (typeof amount === "string") {
      amount = ethers.utils.parseEther(amount)
    }
    return this.transferToken(ZERO_ADDRESS, toAddress, amount, 18)
  }

  withdrawFromEntryPoint = async (toAddress: string, amount: string): Promise<any> => {
    const tx = await this.contract.withdrawTokenFromEntryPoint(
      toAddress,
      ethers.utils.parseEther(amount),
    )
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  getDexManager = async (): Promise<string> => {
    return await this.contract.dexManager()
  }

  setDexManager = async (address: string): Promise<any> => {
    const tx = await this.contract.setDexManager(address)
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }
}
