import { Wallet } from "ethers"

import {
  getChainRpcUrl,
  getDexManagerAddress,
  getEthProvider,
  getSignerSecret,
} from "../src"
import { getDexManagerContractCtrl } from "../src/contract/dexmanager"
import { deployInfinitismEntryPoint } from "../src/contract/infinitism-entrypoint"

const main = async (): Promise<void> => {
  console.log(">>>>>>>>>>> ", getChainRpcUrl())
  const ethProvider = getEthProvider()

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)
  console.log("Superuser address:", superuserWallet.address)

  const { ctrl: entryPointContractCtrl, contract: entryPointDeployedContract } =
    await deployInfinitismEntryPoint(ethProvider, superuserWallet)

  console.log("EntryPoint contract address:", entryPointContractCtrl.contractAddress)
  console.log(
    "EntryPoint contract tx:",
    entryPointDeployedContract.deployTransaction.hash,
  )

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    superuserWallet,
    entryPointContractCtrl.contractAddress,
    getDexManagerAddress(),
  )
  console.log("DexManager contract address:", dexManagerContractCtrl.contractAddress)

  const result = await dexManagerContractCtrl.setEntryPoint(
    entryPointContractCtrl.contractAddress,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
