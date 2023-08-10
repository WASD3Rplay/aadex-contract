import { Signer } from "ethers"

import { UserOperation } from "../aa"
import { EthProvider } from "../eth"

import { Wasd3rDexEntryPoint, Wasd3rDexEntryPoint__factory } from "./types"

export const deployEntryPoint = async (
  ethProvider: EthProvider,
  signer: Signer,
): Promise<EntryPointContractCtrl> => {
  const contract = await new Wasd3rDexEntryPoint__factory(signer).deploy()
  await contract.deployed()

  return new EntryPointContractCtrl(ethProvider, contract.address, signer)
}

export const getEntryPointContractCtrl = async (
  ethProvider: EthProvider,
  signer: Signer,
  contractAddr?: string,
): Promise<EntryPointContractCtrl> => {
  if (contractAddr === undefined || contractAddr.length === 0) {
    return await deployEntryPoint(ethProvider, signer)
  }
  return new EntryPointContractCtrl(ethProvider, contractAddr, signer)
}

export class EntryPointContractCtrl {
  contract: Wasd3rDexEntryPoint

  constructor(
    readonly ethProvider: EthProvider,
    readonly contractAddress: string,
    readonly signer: Signer,
  ) {
    this.contract = Wasd3rDexEntryPoint__factory.connect(contractAddress, this.signer)
  }

  getNewContract = (signer: Signer): EntryPointContractCtrl => {
    return new EntryPointContractCtrl(this.ethProvider, this.contractAddress, signer)
  }

  handleOps = async (
    userOpList: UserOperation[],
    beneficiary: string,
    txOptions: {},
  ): Promise<any> => {
    return this.contract.handleOps(userOpList, beneficiary, txOptions)
  }
}
