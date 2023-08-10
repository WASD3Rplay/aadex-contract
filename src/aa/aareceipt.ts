import { ContractReceipt } from "ethers"

import { UserOperation } from "./userop"

export interface AAContractReceipt extends ContractReceipt {
  userOp?: UserOperation
  userOpIndex?: number
}
