import { Wallet, ethers } from "ethers"

import {
  getDexManagerAddress,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getToAddress,
  transferEth,
} from "../src"
import { getDexManagerContractCtrl } from "../src/contract/dexmanager"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const signerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    signerWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  let toAddress = ""
  try {
    toAddress = getToAddress()
  } catch (error) {
    toAddress = ""
  }

  if (toAddress === signerWallet.address || !toAddress) {
    toAddress = signerWallet.address
    await transferEth(signerWallet, getDexManagerAddress(), "3")
  } else {
    await dexManagerContractCtrl.depositNativeToken(toAddress, "3")
  }

  const balance = await dexManagerContractCtrl.getDexNativeBalanceOf(toAddress)

  console.log("AADex trading AA address:", toAddress)
  console.log("Deposited native balance:", balance.toString(), "ETH")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
