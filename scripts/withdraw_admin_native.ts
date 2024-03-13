import { Wallet, ethers } from "ethers"

import {
  getAdminAddress,
  getDexManagerAddress,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
} from "../src"
import { getDexManagerContractCtrl } from "../src/contract/dexmanager"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const suWallet = new Wallet(getSignerSecret(), ethProvider.provider)
  const adminAddress = getAdminAddress()

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    suWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  const tokenKey = await dexManagerContractCtrl.getNativeTokenKey()
  const amount = ethers.utils.parseEther("1")

  const printBalances = async (): Promise<void> => {
    const suFundingBalance = await suWallet.getBalance()
    const suTradingBalance = await dexManagerContractCtrl.getDexBalanceOf(
      suWallet.address,
      tokenKey,
    )

    console.log("SU address:", suWallet.address)
    console.log(
      "SU funding balance:",
      ethers.utils.formatEther(suFundingBalance),
      "ETH",
    )
    console.log(
      "SU trading balance:",
      ethers.utils.formatEther(suTradingBalance),
      "ETH",
    )

    const adminFundingBalance = await ethProvider.getUnformattedBalance(adminAddress)
    const adminTradingBalance = await dexManagerContractCtrl.getDexBalanceOf(
      adminAddress,
      tokenKey,
    )

    console.log("Admin address:", adminAddress)
    console.log(
      "Admin funding balance:",
      ethers.utils.formatEther(adminFundingBalance),
      "ETH",
    )
    console.log(
      "Admin trading balance:",
      ethers.utils.formatEther(adminTradingBalance),
      "ETH",
    )
  }

  console.log("Before withdraw")
  await printBalances()

  if (adminAddress !== suWallet.address) {
    await dexManagerContractCtrl.transferDexToken(
      adminAddress,
      suWallet.address,
      tokenKey,
      amount,
    )
    console.log("\n-------------------------------------")
    console.log("After transfer")
    await printBalances()
  }

  await dexManagerContractCtrl.withdrawDexToken(tokenKey, amount)

  console.log("\n-------------------------------------")
  console.log("After withdraw")
  await printBalances()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
