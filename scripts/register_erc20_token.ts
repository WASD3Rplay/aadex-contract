import { Wallet } from "ethers"

import {
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getERC20ContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getTokenContractAddress,
  getTokenSymbol,
} from "../src"
import { Wasd3rSampleErc20USDT__factory } from "../typechain-types"

/**
 * Register ERC20 token into DexManager.
 *
 *  * Prerequisite
 *    * deployed EntryPoint contract
 *    * deployed DexManager contract
 *    * deployed ERC20 contract
 *
 *  * Requirements
 *    * NODE_ENTRY_POINT_ADDRESS: EntryPoint contract address
 *    * NODE_DEX_MANAGER_ADDRESS: DexManager contract address
 *    * NODE_SIGNER_SECRET: Superuser's private key
 *    * NODE_TOKEN_SYMBOL: ERC20 token symbol
 *    * NODE_TOKEN_CONTRACT_ADDRESS_${NODE_TOKEN_SYMBOL}: ERC20 token contract address
 *
 * e.g. NODE_ENTRY_POINT_ADDRESS="0xqwe123" NODE_DEX_MANAGER_ADDRESS="0xasd123" NODE_TOKEN_SYMBOL=USDT NODE_TOKEN_SYMBOL_USDT="0xabcd123" npx ts-node ./scripts/register_erc20_token.ts
 */

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

  if (isTokenValid) {
    console.log(`${tokenSymbol} is already regietered!!`)
    console.log(`${tokenSymbol} contract address:`, tokenContractCtrl.contractAddress)
    console.log(`${tokenSymbol} token key:`, tokenKey)
    return
  }

  // Register deployed USDT in AADex
  const txreceipt = await dexmanagerCtrl.registerDexToken(
    1,
    tokenContractCtrl.contractAddress,
    tokenSymbol,
    tokenDecimals,
    0,
  )
  tokenKey = txreceipt.events[0].args?.[1]
  isTokenValid = await dexmanagerCtrl.isValidDexToken(tokenKey)

  console.log(`${tokenSymbol} contract address:`, tokenContractCtrl.contractAddress)
  console.log(`${tokenSymbol} token key:`, tokenKey)
  console.log("            is valid?:", isTokenValid)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
