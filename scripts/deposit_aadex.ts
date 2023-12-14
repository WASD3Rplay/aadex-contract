import { Wallet, ethers } from "ethers"

import {
  getDexManagerAddress,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
} from "../src"
import { getDexManagerContractCtrl } from "../src/contract/dexmanager"
import { getEntryPointContractCtrl } from "../src/contract/entrypoint"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const entryPointContractCtrl = await getEntryPointContractCtrl(
    ethProvider,
    superuserWallet,
    getEntryPointAddress(),
  )

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    superuserWallet,
    entryPointContractCtrl.contractAddress,
    getDexManagerAddress(),
  )

  console.log("Superuser address:", superuserWallet.address)
  console.log("EntryPoint contract address:", entryPointContractCtrl.contractAddress)
  console.log("DexManager contract address:", dexManagerContractCtrl.contractAddress)

  const receipt = await entryPointContractCtrl.depositTo(
    dexManagerContractCtrl.contractAddress,
    "40",
  )
  // console.debug("Deposit result", receipt)

  const depositInfo = await entryPointContractCtrl.getDepositInfo(
    dexManagerContractCtrl.contractAddress,
  )
  console.log("DexManager deposit info:")
  console.log("   * deposit:", ethers.utils.formatEther(depositInfo.deposit), "ETH")
  console.log("   * stake:  ", ethers.utils.formatEther(depositInfo.stake), "ETH")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
