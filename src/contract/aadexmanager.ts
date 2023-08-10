import { TransactionResponse } from "@ethersproject/abstract-provider"
import { BigNumberish } from "ethers"

import { AAContractReceipt, AASigner } from "../aa"
import { EthProvider } from "../eth"

import { DexManagerContractCtrl } from "./dexmanager"
import { DexOrderStruct } from "./types"

export class AADexManagerContractCtrl extends DexManagerContractCtrl {
  aasigner: AASigner

  constructor(ethProvider: EthProvider, contractAddress: string, signer: AASigner) {
    super(ethProvider, contractAddress, signer)

    this.aasigner = signer
  }

  sendUserOps(
    maxPriorityFeePerGas?: BigNumberish,
    maxFeePerGas?: BigNumberish,
  ): Promise<TransactionResponse> {
    return this.aasigner.sendUserOps(maxPriorityFeePerGas, maxFeePerGas)
  }

  swap = async (
    tradeId: number,
    tradeItemId: number,
    buyerOrder: DexOrderStruct,
    buyerAddress: string,
    buyerFeeAmount: BigNumberish,
    sellerOrder: DexOrderStruct,
    sellerAddress: string,
    sellerFeeAmount: BigNumberish,
    baseTokenKey: string,
    baseTokenAmount: BigNumberish,
    quoteTokenKey: string,
    quoteTokenAmount: BigNumberish,
    feeCollector: string,
  ): Promise<AAContractReceipt> => {
    // The return data is userop, `UserOperation` data, not a transaction data.
    // And, it doesn't send anything to a blockchain node before calling `sendUserOps`.
    // The userop is stacked in the `aasigner` instance
    // and these stacked userops will be sent when calling `aasigner.sendUserOps`
    const userOp = await this.contract.swap(
      tradeId,
      tradeItemId,
      buyerOrder,
      buyerAddress,
      buyerFeeAmount,
      sellerOrder,
      sellerAddress,
      sellerFeeAmount,
      baseTokenKey,
      baseTokenAmount,
      quoteTokenKey,
      quoteTokenAmount,
      feeCollector,
    )
    // The receipt is not real receipt data,
    // it's only have `UserOperation` data and stacked index.
    const receipt = await userOp.wait()
    return receipt
  }
}
