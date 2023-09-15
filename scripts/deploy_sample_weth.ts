import { Wallet } from "ethers"

import {
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getERC20ContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getTokenContractAddress,
} from "../src"
import { deployERC20Contract } from "../src/contract/erc20"
import { Wasd3rSampleErc20WrappedETH__factory } from "../src/contract/types"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()
  const wethOwnerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const wethCtrl = await deployERC20Contract(
    ethProvider,
    wethOwnerWallet,
    Wasd3rSampleErc20WrappedETH__factory,
  )
  // For register only, comment the above and comment out the below
  /*
  const wethCtrl = await getERC20ContractCtrl(
    Wasd3rSampleErc20WrappedETH__factory,
    ethProvider,
    wethOwnerWallet,
    getTokenContractAddress("WETH"),
  )
  */

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const dexmanagerCtrl = await getDexManagerContractCtrl(
    ethProvider,
    superuserWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  // Register deployed USDT in AADex
  const txreceipt = await dexmanagerCtrl.registerDexToken(
    1,
    wethCtrl.contractAddress,
    "WETH",
    await wethCtrl.getDecimals(),
    0,
  )
  const wethTokenKey = txreceipt.events[0].args?.[1]

  console.log("WETH owner address:", wethOwnerWallet.address)
  console.log("Sample WETH contract address:", wethCtrl.contractAddress)
  console.log("Sample WETH token key:", wethTokenKey)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
