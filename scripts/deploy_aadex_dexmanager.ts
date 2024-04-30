import { Wallet, ethers } from "ethers"

import {
  getChainRpcUrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
} from "../src"
import { deployDexManager } from "../src/contract/dexmanager"
import { deployEntryPoint } from "../src/contract/entrypoint"

const main = async (): Promise<void> => {
  console.log(">>>>>>>>>>> ", getChainRpcUrl())
  const ethProvider = getEthProvider()

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)
  console.log("Superuser address:", superuserWallet.address)

  const entryPointContractAddress = getEntryPointAddress()
  console.log("EntryPoint contract address:", entryPointContractAddress)

  const { ctrl: dexManagerContractCtrl, contract: dexManagerDeployedContract } =
    await deployDexManager(ethProvider, superuserWallet, entryPointContractAddress)

  console.log("DexManager contract address:", dexManagerContractCtrl.contractAddress)
  console.log(
    "DexManager contract tx:",
    dexManagerDeployedContract.deployTransaction.hash,
  )

  const nativeTokenKey = await dexManagerContractCtrl.getNativeTokenKey()
  const isNativeTokenValid =
    await dexManagerContractCtrl.isValidDexToken(nativeTokenKey)
  console.log("Native Token Key:", nativeTokenKey)
  console.log("       is valid?:", isNativeTokenValid)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
