import { Wallet } from "ethers"

import {
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
} from "../src"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const signerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    signerWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  const receipt = await dexManagerContractCtrl.depositNativeToken(
    signerWallet.address,
    "1", // 1 ETH
  )
  console.log("Native token deposit result:", receipt)

  const balance = await dexManagerContractCtrl.getDexNativeBalanceOf(
    signerWallet.address,
  )

  console.log("Native token owner address:", signerWallet.address)
  console.log("Native token owner's balance:", balance)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
