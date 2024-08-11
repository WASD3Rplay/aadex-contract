import { Wallet, ethers } from "ethers"

import {
  getAmount,
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

  const amount = getAmount()
  const decimals = await tokenContractCtrl.getDecimals()

  const tokenKey = await dexManagerContractCtrl.getTokenKey(
    1,
    tokenContractAddress,
    decimals,
    0,
  )

  const account_address = signerWallet.address
  await tokenContractCtrl.approve(dexManagerContractCtrl.contractAddress, amount)

  await dexManagerContractCtrl.depositDexToken(
    account_address,
    tokenKey,
    ethers.utils.parseUnits(amount, decimals),
    // {
    //   maxFeePerGas: ethers.utils.parseUnits("2295000000", 0),
    //   maxPriorityFeePerGas: ethers.utils.parseUnits("795000000", 0),
    //   gasLimit: 150000,
    // },
  )

  const balance = await dexManagerContractCtrl.getDexBalanceOf(
    account_address,
    tokenKey,
  )

  console.log("AADex trading AA address:", account_address)
  console.log("Token:", tokenSymbol, `(${tokenKey})`)
  console.log(
    "Deposited balance:",
    ethers.utils.formatUnits(balance, decimals),
    tokenSymbol,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
