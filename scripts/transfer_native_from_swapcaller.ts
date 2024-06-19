import { Wallet, ethers } from "ethers"

import {
  getEthProvider,
  getSignerSecret,
  getSwapCallerAddress,
  getSwapCallerContractCtrl,
  getToAddress,
  getAmount,
} from "../src"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const signerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const swapCallerAddress = getSwapCallerAddress()
  const swapCallerCtrl = await getSwapCallerContractCtrl(
    ethProvider,
    signerWallet,
    swapCallerAddress,
  )

  let toAddress = ""
  try {
    toAddress = getToAddress()
  } catch (error) {
    toAddress = signerWallet.address
  }

  const printBalances = async (): Promise<void> => {
    const signerBalance = await signerWallet.getBalance()

    console.log("Signer address:", signerWallet.address)
    console.log("Signer balance:", ethers.utils.formatEther(signerBalance), "ETH")

    const swapCallerBalance = await ethProvider.getUnformattedBalance(swapCallerAddress)

    console.log("SwapCaller address:", swapCallerAddress)
    console.log(
      "SwapCaller balance:",
      ethers.utils.formatEther(swapCallerBalance),
      "ETH",
    )
  }

  console.log("...... before Transfer ETH")
  await printBalances()

  const amount = getAmount()
  await swapCallerCtrl.transferEth(toAddress, amount)

  console.log("...... after Transfer ETH")
  await printBalances()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
