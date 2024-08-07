import { Wallet } from "ethers"

import {
  getDexManagerAddress,
  getEthProvider,
  getSignerSecret,
  getSwapCallerAddress,
  getSwapCallerContractCtrl,
} from "../src"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)
  console.log("Superuser address:", superuserWallet.address)

  const dexManagerContractAddr = getDexManagerAddress()
  const swapCallerContractAddr = getSwapCallerAddress()

  if (!swapCallerContractAddr) {
    throw new Error("Cannot recognize swap caller contract address:")
  }

  const swapCallerContractCtrl = await getSwapCallerContractCtrl(
    ethProvider,
    superuserWallet,
    swapCallerContractAddr,
  )

  console.log("Swap Caller contract address:", swapCallerContractCtrl.contractAddress)

  const addr = await swapCallerContractCtrl.getDexManager()
  if (addr === dexManagerContractAddr) {
    console.log("Swap Caller's Dex Manager Contract Address is same:", addr)
    return
  }

  await swapCallerContractCtrl.setDexManager(dexManagerContractAddr)

  console.log(
    "Swap Caller's Dex Manager Contract Address:",
    await swapCallerContractCtrl.getDexManager(),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
