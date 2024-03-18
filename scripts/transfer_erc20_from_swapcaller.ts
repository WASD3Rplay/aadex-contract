import { Wallet, ethers } from "ethers"

import {
  getERC20ContractCtrl,
  getEthProvider,
  getSignerSecret,
  getSwapCallerAddress,
  getSwapCallerContractCtrl,
  getToAddress,
  getTokenContractAddress,
  getTokenSymbol,
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

  const tokenSymbol = getTokenSymbol()
  const tokenContractAddress = getTokenContractAddress(tokenSymbol)
  const tokenContractCtrl = await getERC20ContractCtrl(
    ethProvider,
    signerWallet,
    tokenContractAddress,
  )
  const tokenDecimals = await tokenContractCtrl.getDecimals()

  let toAddress = ""
  try {
    toAddress = getToAddress()
  } catch (error) {
    toAddress = signerWallet.address
  }

  const printBalances = async (): Promise<void> => {
    const signerBalance = await tokenContractCtrl.getUnformattedBalanceOf(
      signerWallet.address,
    )

    console.log("Signer address:", signerWallet.address)
    console.log(
      "Signer balance:",
      ethers.utils.formatUnits(signerBalance, tokenDecimals),
      tokenSymbol,
    )

    const swapCallerBalance = await tokenContractCtrl.getUnformattedBalanceOf(
      swapCallerAddress,
    )

    console.log("SwapCaller address:", swapCallerAddress)
    console.log(
      "SwapCaller balance:",
      ethers.utils.formatUnits(swapCallerBalance, tokenDecimals),
      tokenSymbol,
    )
  }

  console.log(`...... before Transfer ${tokenSymbol}`)
  await printBalances()

  await swapCallerCtrl.transferToken(
    tokenContractAddress,
    toAddress,
    "10",
    tokenDecimals,
  )

  console.log(`...... after Transfer ${tokenSymbol}`)
  await printBalances()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
