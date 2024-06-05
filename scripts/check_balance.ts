import { Wallet, ethers } from "ethers"

import {
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getERC20ContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getToAddress,
  getTokenContractAddress,
  getTokenSymbol,
} from "../src"
import { Wasd3rSampleErc20USDT__factory } from "../src/contract/types"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  let tokenSymbol = ""
  try {
    tokenSymbol = getTokenSymbol()
  } catch (error) {
    console.error("Need to input token symbol by env var NODE_TOKEN_SYMBOL")
    return
  }
  const tokenContractAddress = getTokenContractAddress(tokenSymbol)

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const tokenContractCtrl = await getERC20ContractCtrl(
    ethProvider,
    superuserWallet,
    tokenContractAddress,
    Wasd3rSampleErc20USDT__factory,
  )
  const tokenDecimals = await tokenContractCtrl.getDecimals()

  const tokenType = 1 // ERC20

  const dexmanagerCtrl = await getDexManagerContractCtrl(
    ethProvider,
    superuserWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )
  let tokenKey = await dexmanagerCtrl.getTokenKey(
    tokenType,
    tokenContractAddress,
    tokenDecimals,
    0,
  )
  let isTokenValid = await dexmanagerCtrl.isValidDexToken(tokenKey)
  if (!isTokenValid) {
    console.log(`${tokenSymbol} is not valid!!`)
    console.log(`${tokenSymbol} contract address:`, tokenContractCtrl.contractAddress)
    console.log(`${tokenSymbol} token key:`, tokenKey)
    return
  }

  const accountAddress = getToAddress()
  console.info("Dex AA Account:", accountAddress)

  const accountValid = await dexmanagerCtrl.getDexAccountValid(accountAddress)
  console.info(" >>>>>>> ", accountValid)

  let balance = await dexmanagerCtrl.getDexNativeBalanceOf(accountAddress)
  let hBalance = ethers.utils.formatEther(balance)
  console.info("\t * Native Balance:", hBalance, "ETH (", balance, ")")

  balance = await dexmanagerCtrl.getDexBalanceOf(accountAddress, tokenKey)
  hBalance = ethers.utils.formatUnits(balance, tokenDecimals)
  console.info(
    `\t * ${tokenSymbol} Balance:`,
    hBalance,
    tokenSymbol,
    " (",
    balance,
    ")",
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
