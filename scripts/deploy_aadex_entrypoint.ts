import { Wallet, ethers } from "ethers"

import {
  getChainRpcUrl,
  getDexManagerAddress,
  getEthProvider,
  getSignerSecret,
} from "../src"
import { deployDexManager, getDexManagerContractCtrl } from "../src/contract/dexmanager"
import { deployEntryPoint } from "../src/contract/entrypoint"

const main = async (): Promise<void> => {
  console.log(">>>>>>>>>>> ", getChainRpcUrl())
  const ethProvider = getEthProvider()

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)
  console.log("Superuser address:", superuserWallet.address)

  const { ctrl: entryPointContractCtrl, contract: entryPointDeployedContract } =
    await deployEntryPoint(ethProvider, superuserWallet)

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
