import { Signer } from "ethers"

import { getDexManagerAddress, getEntryPointAddress } from "../config"
import { EthProvider } from "../eth"

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
}
