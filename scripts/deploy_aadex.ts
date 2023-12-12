import { Wallet } from "ethers"

import { ZERO_ADDRESS, getEthProvider, getSignerSecret } from "../src"
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
    "DexManager contract tx:",
    dexManagerDeployedContract.deployTransaction.hash,
  )

  const nativeTokenKey = await dexManagerContractCtrl.getNativeTokenKey()
  const isNativeTokenValid = await dexManagerContractCtrl.isValidDexToken(
    nativeTokenKey,
  )
  console.log("Native Token Key:", nativeTokenKey)
  console.log("       is valid?:", isNativeTokenValid)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
