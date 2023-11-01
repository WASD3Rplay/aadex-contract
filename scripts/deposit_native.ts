import { Wallet, ethers } from "ethers"

import {
  ZERO_ADDRESS,
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

  let balance = await dexManagerContractCtrl.getDexNativeBalanceOf(signerWallet.address)

  console.log("Native token owner address:", signerWallet.address)
  console.log("Native token owner's balance:", ethers.utils.formatEther(balance))

  const tokenKey = await dexManagerContractCtrl.getTokenKey(0, ZERO_ADDRESS, 18, 0)
  await dexManagerContractCtrl.withdrawDexToken(
    ZERO_ADDRESS,
    tokenKey,
    ethers.utils.parseEther("1"),
  )

  balance = await dexManagerContractCtrl.getDexNativeBalanceOf(signerWallet.address)

  console.log("Native token owner address:", signerWallet.address)
  console.log("Native token owner's balance:", ethers.utils.formatEther(balance))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
