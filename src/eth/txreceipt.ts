import { TransactionReceipt } from "@ethersproject/abstract-provider"
import { ContractReceipt } from "ethers"

export class TxReceipt {
  txhash: string
  gasUsed: string
  fromAddr: string
  toAddr: string
  blockNo: number

  constructor(readonly receipt: ContractReceipt | TransactionReceipt) {
    this.txhash = receipt.transactionHash
    this.gasUsed = receipt.gasUsed.toString()
    this.fromAddr = receipt.from
    this.toAddr = receipt.to
    this.blockNo = receipt.blockNumber
  }

  toString = (): string => {
    return `from(${this.fromAddr}) -> to(${this.toAddr}), gasUsed: '${this.gasUsed}', (${this.blockNo}) ${this.txhash}`
  }
}
