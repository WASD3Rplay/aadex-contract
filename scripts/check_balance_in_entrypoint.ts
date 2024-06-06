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

  const entryPointContractCtrl = await getEntryPointContractCtrl(
    ethProvider,
    superuserWallet,
    getEntryPointAddress(),
  )

  console.log("Superuser address:", superuserWallet.address)
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
