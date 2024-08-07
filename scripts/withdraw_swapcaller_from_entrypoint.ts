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
  let depositInfo = await entryPointContractCtrl.getDepositInfo(swapCallerContractAddr)
  const depositAmount = ethers.utils.formatEther(depositInfo.deposit)

  if (Number(depositAmount) < Number(amount)) {
    throw new Error(
      `Not enought deposit amount to withdraw: ${depositAmount} < ${amount}`,
    )
  }

  await swapCallerContractCtrl.withdrawFromEntryPoint(superuserWallet.address, amount)

  console.log(`${amount} is withdrawn to ${superuserWallet.address}`)

  depositInfo = await entryPointContractCtrl.getDepositInfo(swapCallerContractAddr)

  console.log(`Deposit info in EntryPoint of ${swapCallerContractAddr}:`)
  console.log("   * deposit:", ethers.utils.formatEther(depositInfo.deposit), "ETH")
  console.log("   * stake:  ", ethers.utils.formatEther(depositInfo.stake), "ETH")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
