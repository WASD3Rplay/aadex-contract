import { Wallet } from "ethers"

import {
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
} from "../src"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()
  const adminWallet = new Wallet(getSignerSecret(), ethProvider.provider)
  const entryPointContractAddr = getEntryPointAddress()
  const dexManagerContractAddr = getDexManagerAddress()

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    adminWallet,
    entryPointContractAddr,
    dexManagerContractAddr,
  )

  const swapStep = await dexManagerContractCtrl.getSwapStep()
  console.log(" Swap Step:", swapStep)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
