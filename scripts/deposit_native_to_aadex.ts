import { Wallet, ethers } from "ethers"

import {
  getDexManagerAddress,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  transferEth,
} from "../src"
import { getDexManagerContractCtrl } from "../src/contract/dexmanager"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const signerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  await transferEth(signerWallet, getDexManagerAddress(), "3")

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    signerWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  const balance = await dexManagerContractCtrl.getDexNativeBalanceOf(
    signerWallet.address,
  )

  console.log("AADex user address:", signerWallet.address)
  console.log("Deposited native balance:", balance.toString(), "ETH")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
