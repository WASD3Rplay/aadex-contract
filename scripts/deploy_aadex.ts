import { Wallet, ethers } from "ethers"

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
    "DexManager contract tx:",
    dexManagerDeployedContract.deployTransaction.hash,
  )

  await entryPointContractCtrl.depositTo(dexManagerContractCtrl.contractAddress, "1")
  const depositInfo = await entryPointContractCtrl.getDepositInfo(
    dexManagerContractCtrl.contractAddress,
  )
  console.log("DexManager deposit info:")
  console.log("   * deposit:", ethers.utils.formatEther(depositInfo.deposit), "ETH")
  console.log("   * stake:  ", ethers.utils.formatEther(depositInfo.stake), "ETH")

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
