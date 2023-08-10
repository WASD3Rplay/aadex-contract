import { ContractReceipt, Event } from "ethers"

import { TxReceipt } from "./txreceipt"

export class TxContractReceipt extends TxReceipt {
  events: Event[]

  constructor(readonly receipt: ContractReceipt) {
    super(receipt)

    this.events = receipt.events ?? []
  }
}
