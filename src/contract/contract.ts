import { Signer, Wallet } from "ethers"

import { EthProvider } from "../eth"

export class ContractCtrl<T> {
  contract: T

  constructor(
    readonly contractFactoryClass: any,
    readonly ethProvider: EthProvider,
    readonly contractAddress: string,
    readonly signer: Wallet | Signer,
  ) {
    this.contract = this.contractFactoryClass.connect(this.contractAddress, this.signer)
  }
}
