import { TransactionResponse } from "@ethersproject/abstract-provider"
import { BytesLike } from "@ethersproject/bytes"
import {
  Deferrable,
  defineReadOnly,
  resolveProperties,
} from "@ethersproject/properties"
import { Provider, TransactionRequest } from "@ethersproject/providers"
import {
  BigNumber,
  BigNumberish,
  Signer,
  TypedDataDomain,
  TypedDataField,
} from "ethers"

import { EthProvider } from "../eth"
import { DefaultUserOp, fillAndSign, UserOperation } from "./userop"

export type SendUserOpsFunc = (
  maxPriorityFeePerGas: BigNumberish,
  maxFeePerGas: BigNumberish,
  userOpList: UserOperation[],
  userOpsTxGasLimit?: BigNumberish,
) => Promise<TransactionResponse>

/**
 * a signer that wraps account-abstraction.
 */
export class AASigner extends Signer {
  userOps: UserOperation[]
  userOpsCallGasLimit: BigNumber

  constructor(
    readonly ethProvider: EthProvider,
    readonly chainId: number,
    // AA signer is verified in `_validateSignature` of `Wasd3rDexManager` contract.
    readonly userOpSigner: Signer,
    // AA (smart) wallet address == account contract address
    // Sender contract is used in
    //   - `_validateAccountPerpayment` of `Wasd3rDexEntryPoint` contract
    //      to validate `UserOperation`: `signature` and `nonce`
    //   - `innerHandleOp` of `Wasd3rDexEntryPoint` contract
    //      to send `UserOperation.callData` to execute (call) a function
    readonly aaSenderAddress: string,
    // AA (smart) wallet's nonce managed in `Wasd3rDexEntryPoint` contract.
    // It validates an execution sequence of `UserOperation`
    // in `_validateAndUpdateNonce` of `NonceManager` of `Wasd3rDexEntryPoint` contract.
    readonly aaSenderNonce: number,
    readonly entryPointAddress: string,
    readonly sendUserOpFunc: SendUserOpsFunc,
    readonly maxBaseFeePerGas: BigNumber,
    readonly maxCallGasLimit: BigNumber | null = null,
    readonly paymaster: null = null,
    readonly verifyingSigner: Signer | null = null,
  ) {
    super()

    defineReadOnly(this, "provider", this.ethProvider.provider)

    this.userOps = []
    this.userOpsCallGasLimit = BigNumber.from("0")
  }

  connect(provider: Provider): Signer {
    throw new Error("connect: unsupported by AA")
  }

  async signTransaction(transaction: Deferrable<TransactionRequest>): Promise<string> {
    throw new Error("signTransaction: unsupported by AA")
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    throw new Error("signMessage: unsupported by AA")
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>,
  ): Promise<string> {
    throw new Error("signMessage: unsupported by AA")
  }

  async getAddress(): Promise<string> {
    return this.aaSenderAddress
  }

  getUserOpNonce(): number {
    return this.aaSenderNonce + this.userOps.length
  }

  async _createUserOperation(
    transaction: Deferrable<TransactionRequest>,
  ): Promise<UserOperation> {
    const tx: TransactionRequest = await resolveProperties(transaction)

    let { gasPrice, maxPriorityFeePerGas, maxFeePerGas } = tx

    // gasPrice is legacy, and overrides eip1559 values:
    if (gasPrice) {
      maxPriorityFeePerGas = gasPrice
      maxFeePerGas = gasPrice
    } else {
      maxPriorityFeePerGas = DefaultUserOp.maxPriorityFeePerGas
      maxFeePerGas = this.maxBaseFeePerGas.add(maxPriorityFeePerGas as BigNumber)
    }

    const partialUserOp = {
      sender: this.aaSenderAddress,
      nonce: this.getUserOpNonce(),
      callData: tx.data as BytesLike,
      callGasLimit: (tx.gasLimit ?? this.maxCallGasLimit) as BigNumberish,
      maxPriorityFeePerGas,
      maxFeePerGas,
    }

    const userOp = await fillAndSign(
      this.ethProvider,
      this.chainId,
      this.entryPointAddress,
      this.userOpSigner,
      partialUserOp,
    )

    return userOp
  }

  async sendTransaction(tx: TransactionRequest): Promise<any> {
    const userOp = await this._createUserOperation(tx)

    this.userOps.push(userOp)
    this.userOpsCallGasLimit.add(userOp.callGasLimit)

    //return await this.sendUserOpFunc(userOp)
    return <TransactionResponse>{
      wait: async (confirmation?: number) => {
        return {
          logs: [] as Array<any>,
          userOp,
          userOpIndex: this.userOps.length,
        } as any
      },
    }
  }

  async sendUserOps(
    maxPriorityFeePerGas?: BigNumberish,
    maxFeePerGas?: BigNumberish,
  ): Promise<TransactionResponse> {
    if (maxPriorityFeePerGas === undefined) {
      maxPriorityFeePerGas = DefaultUserOp.maxPriorityFeePerGas
    }
    if (maxFeePerGas === undefined) {
      maxFeePerGas = this.maxBaseFeePerGas.add(maxPriorityFeePerGas as BigNumber)
    }

    return await this.sendUserOpFunc(maxPriorityFeePerGas, maxFeePerGas, this.userOps)
  }
}
