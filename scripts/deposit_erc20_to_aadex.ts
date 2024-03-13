import { Wallet, ethers } from "ethers"

import {
  getDexManagerAddress,
  getERC20ContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getToAddress,
  getTokenContractAddress,
  getTokenSymbol,
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

  const tokenSymbol = getTokenSymbol()
  let tokenContractAddress
  try {
    tokenContractAddress = getTokenContractAddress(tokenSymbol)
  } catch (error) {
    throw new Error(`Need to deploy the token (${tokenSymbol}) first: ${error}`)
  }

  const tokenContractCtrl = await getERC20ContractCtrl(
    ethProvider,
    signerWallet,
    tokenContractAddress,
  )

  const amount = "1234"
  const decimals = await tokenContractCtrl.getDecimals()

  await tokenContractCtrl.approve(dexManagerContractCtrl.contractAddress, amount)

  const tokenKey = await dexManagerContractCtrl.getTokenKey(
    1,
    tokenContractAddress,
    decimals,
    0,
  )

  await dexManagerContractCtrl.depositDexToken(
    signerWallet.address,
    tokenKey,
    ethers.utils.parseUnits(amount, decimals),
  )

  const balance = await dexManagerContractCtrl.getDexBalanceOf(
    signerWallet.address,
    tokenKey,
  )

  console.log("AADex trading AA address:", signerWallet.address)
  console.log("Token:", tokenSymbol, `(${tokenKey})`)
  console.log(
    "Deposited native balance:",
    ethers.utils.formatUnits(balance, decimals),
    tokenSymbol,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
