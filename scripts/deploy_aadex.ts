import { Wallet } from "ethers"

import { getEthProvider, getSignerSecret } from "../src"
import { deployDexManager } from "../src/contract/dexmanager"
import { deployEntryPoint } from "../src/contract/entrypoint"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const entryPointContractCtrl = await deployEntryPoint(ethProvider, superuserWallet)

  const dexManagerContractCtrl = await deployDexManager(
    ethProvider,
    superuserWallet,
    entryPointContractCtrl.contractAddress,
  )

  console.log("Superuser address:", superuserWallet.address)
  console.log("EntryPoint contract address:", entryPointContractCtrl.contractAddress)
  console.log("DexManager contract address:", dexManagerContractCtrl.contractAddress)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
