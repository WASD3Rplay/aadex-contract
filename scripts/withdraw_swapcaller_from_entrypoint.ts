import { Wallet, ethers } from "ethers"

import {
  getAmount,
  getEntryPointAddress,
  getEntryPointContractCtrl,
  getEthProvider,
  getSignerSecret,
  getSwapCallerAddress,
  getSwapCallerContractCtrl,
} from "../src"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)
  console.log("Superuser address:", superuserWallet.address)

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

  const amount = getAmount()

  await swapCallerContractCtrl.withdrawFromEntryPoint(superuserWallet.address, amount)

  console.log(`${amount} is withdrawn to ${superuserWallet.address}`)

  const entryPointContractAddr = getEntryPointAddress()

  if (!entryPointContractAddr) {
    throw new Error("Cannot recognize entry point address:")
  }

  const entryPointContractCtrl = await getEntryPointContractCtrl(
    ethProvider,
    superuserWallet,
    entryPointContractAddr,
  )

  console.log("EntryPoint contract address:", entryPointContractCtrl.contractAddress)

  const depositInfo =
    await entryPointContractCtrl.getDepositInfo(swapCallerContractAddr)

  console.log(`Deposit info in EntryPoint of ${swapCallerContractAddr}:`)
  console.log("   * deposit:", ethers.utils.formatEther(depositInfo.deposit), "ETH")
  console.log("   * stake:  ", ethers.utils.formatEther(depositInfo.stake), "ETH")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
