import { Wallet } from "ethers"

import { getEthProvider, getSignerSecret } from "../src"
import { deployDexManager } from "../src/contract/dexmanager"
import { deployEntryPoint } from "../src/contract/entrypoint"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const { ctrl: entryPointContractCtrl, contract: entryPointDeployedContract } =
    await deployEntryPoint(ethProvider, superuserWallet)

  const { ctrl: dexManagerContractCtrl, contract: dexManagerDeployedContract } =
    await deployDexManager(
      ethProvider,
      superuserWallet,
      entryPointContractCtrl.contractAddress,
    )

  console.log("Superuser address:", superuserWallet.address)
  console.log("EntryPoint contract address:", entryPointContractCtrl.contractAddress)
  console.log(
    "EntryPoint contract tx:",
    entryPointDeployedContract.deployTransaction.hash,
  )
  console.log("DexManager contract address:", dexManagerContractCtrl.contractAddress)
  console.log(
    "DexManager contract address:",
    dexManagerDeployedContract.deployTransaction.hash,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
