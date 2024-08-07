import { Wallet } from "ethers"

import {
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getMarketAdminSecret,
  getSignerSecret,
} from "../src"
import { deploySwapCaller } from "../src/contract/swapcaller"

/**
 * Create Swap Caller.
 *
 *  * Prerequisite
 *    * deployed EntryPoint contract
 *    * deployed DexManager contract
 *
 *  * Requirements
 *    * NODE_ENTRY_POINT_ADDRESS: EntryPoint contract address
 *    * NODE_DEX_MANAGER_ADDRESS: DexManager contract address
 *    * NODE_SIGNER_SECRET: Superuser's private key
 *    * NODE_MARKET_ADMIN_SECRET: Swap caller EOA's private key
 *
 * e.g. NODE_ENTRY_POINT_ADDRESS="0xqwe123" NODE_DEX_MANAGER_ADDRESS="0xasd123" NODE_MARKET_ADMIN_SECRET="0xabcd123" npx ts-node ./scripts/deploy_swap_caller.ts
 */

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)
  const marketAdminWallet = new Wallet(getMarketAdminSecret(), ethProvider.provider)

  const entryPointContractAddress = getEntryPointAddress()
  console.log("EntryPoint contract address:", entryPointContractAddress)
  const dexManagerContractAddress = getDexManagerAddress()

  const { ctrl: swapCallerContractCtrl, contract: swapCallerDeployedContract } =
    await deploySwapCaller(
      ethProvider,
      marketAdminWallet,
      entryPointContractAddress,
      dexManagerContractAddress,
    )
  const swapCallerOwner = await swapCallerContractCtrl.getOwner()

  console.log("Market Admin address:", marketAdminWallet.address)
  console.log("SwapCaller contract address:", swapCallerContractCtrl.contractAddress)
  console.log("SwapCaller contract owner:", swapCallerOwner)
  console.log(
    "SwapCaller contract tx:",
    swapCallerDeployedContract.deployTransaction.hash,
  )

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    superuserWallet,
    entryPointContractAddress,
    dexManagerContractAddress,
  )
  console.log("DexManager contract address:", dexManagerContractCtrl.contractAddress)

  let isSwapcallerAdmin = await dexManagerContractCtrl.isAdmin(
    swapCallerContractCtrl.contractAddress,
  )
  // let isSwapcallerAdmin = await dexManagerContractCtrl.isAdmin(swapcallerAddr)

  if (!isSwapcallerAdmin) {
    await dexManagerContractCtrl.addAdmin(swapCallerContractCtrl.contractAddress)
  }
  isSwapcallerAdmin = await dexManagerContractCtrl.isAdmin(
    swapCallerContractCtrl.contractAddress,
  )

  console.log("SwapCaller in DexManager:")
  console.log("   * isAdmin:", isSwapcallerAdmin)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
