import { Wallet, ethers } from "ethers"

import {
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getToAddress,
} from "../src"
import { getEntryPointContractCtrl } from "../src/contract/entrypoint"

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

  const toAddress = getToAddress()

  const depositInfo = await entryPointContractCtrl.getDepositInfo(toAddress)

  console.log(`Deposit info in EntryPoint of ${toAddress}:`)
  console.log("   * deposit:", ethers.utils.formatEther(depositInfo.deposit), "ETH")
  console.log("   * stake:  ", ethers.utils.formatEther(depositInfo.stake), "ETH")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
