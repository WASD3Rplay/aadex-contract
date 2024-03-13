import { Wallet, ethers } from "ethers"

import {
  getAdminAddress,
  getDexManagerAddress,
  getERC20ContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getTokenContractAddress,
  getTokenSymbol,
} from "../src"
import { getDexManagerContractCtrl } from "../src/contract/dexmanager"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const suWallet = new Wallet(getSignerSecret(), ethProvider.provider)
  const adminAddress = getAdminAddress()

  const tokenSymbol = getTokenSymbol()
  const tokenContractAddress = getTokenContractAddress(tokenSymbol)
  const tokenContractCtrl = await getERC20ContractCtrl(
    ethProvider,
    suWallet,
    tokenContractAddress,
  )
  const tokenDecimals = await tokenContractCtrl.getDecimals()

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    suWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  const tokenKey = await dexManagerContractCtrl.getTokenKey(
    1,
    tokenContractAddress,
    await tokenContractCtrl.getDecimals(),
    0,
  )
  const amount = ethers.utils.parseUnits("1", tokenDecimals)

  const printBalances = async (): Promise<void> => {
    const suFundingBalance = await tokenContractCtrl.getUnformattedBalanceOf(
      suWallet.address,
    )
    const suTradingBalance = await dexManagerContractCtrl.getDexBalanceOf(
      suWallet.address,
      tokenKey,
    )

    console.log("SU address:", suWallet.address)
    console.log(
      "SU funding balance:",
      ethers.utils.formatUnits(suFundingBalance, tokenDecimals),
      tokenSymbol,
    )
    console.log(
      "SU trading balance:",
      ethers.utils.formatUnits(suTradingBalance, tokenDecimals),
      tokenSymbol,
    )

    const adminFundingBalance = await tokenContractCtrl.getUnformattedBalanceOf(
      adminAddress,
    )
    const adminTradingBalance = await dexManagerContractCtrl.getDexBalanceOf(
      adminAddress,
      tokenKey,
    )

    console.log("Admin address:", adminAddress)
    console.log(
      "Admin funding balance:",
      ethers.utils.formatUnits(adminFundingBalance, tokenDecimals),
      tokenSymbol,
    )
    console.log(
      "Admin trading balance:",
      ethers.utils.formatUnits(adminTradingBalance, tokenDecimals),
      tokenSymbol,
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
