import { BigNumber, Signer, ethers } from "ethers"

import { UserOperation } from "../aa"
import { EthProvider, TxContractReceipt } from "../eth"

import { Wasd3rDexEntryPoint, Wasd3rDexEntryPoint__factory } from "./types"

export const deployEntryPoint = async (
  ethProvider: EthProvider,
  signer: Signer,
): Promise<{ ctrl: EntryPointContractCtrl; contract: any }> => {
  const contract = await new Wasd3rDexEntryPoint__factory(signer).deploy()
  await contract.deployed()

  return {
    ctrl: new EntryPointContractCtrl(ethProvider, contract.address, signer),
    contract: contract,
  }
}

export const getEntryPointContractCtrl = async (
  ethProvider: EthProvider,
  signer: Signer,
  contractAddr?: string,
): Promise<EntryPointContractCtrl> => {
  if (contractAddr === undefined || contractAddr.length === 0) {
    const ret = await deployEntryPoint(ethProvider, signer)
    return ret.ctrl
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

  depositTo = async (addr: string, amount: string): Promise<any> => {
    const tx = await this.contract.depositTo(addr, {
      value: ethers.utils.parseEther(amount),
    })
    const receipt = await tx.wait()
    return new TxContractReceipt(receipt)
  }

  getDepositInfo = async (addr: string): Promise<any> => {
    return this.contract.getDepositInfo(addr)
  }

  getNonce = async (addr: string): Promise<BigNumber> => {
    const nonce = await this.contract.nonceSequenceNumber(addr, 0)
    return nonce
  }
}
