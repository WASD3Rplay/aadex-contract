import { Wallet, ethers } from "ethers"

import {
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
} from "../src"
import { deploySwapCaller } from "../src/contract/swapcaller"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const entryPointContractAddress = getEntryPointAddress()
  const dexManagerContractAddress = getDexManagerAddress()

  const { ctrl: swapCallerContractCtrl, contract: swapCallerDeployedContract } =
    await deploySwapCaller(
      ethProvider,
      superuserWallet,
      entryPointContractAddress,
      dexManagerContractAddress,
    )

  console.log("Superuser address:", superuserWallet.address)
  console.log("SwapCaller contract address:", swapCallerContractCtrl.contractAddress)
  console.log(
    "SwapCaller contract tx:",
    swapCallerDeployedContract.deployTransaction.hash,
  )

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    superuserWallet,
    entryPointContractAddress,
    dexManagerContractAddress,
  )

  console.log("SwapCaller in DexManager:")
  console.log(
    "   * isAdmin:",
    await dexManagerContractCtrl.isAdmin(swapCallerContractCtrl.contractAddress),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
