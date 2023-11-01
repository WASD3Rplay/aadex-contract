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
import { Wasd3rSampleErc20USDT__factory } from "../src/contract/types"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()
  const usdtOwnerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const usdtCtrl = await deployERC20Contract(
    ethProvider,
    usdtOwnerWallet,
    Wasd3rSampleErc20USDT__factory,
  )
  // For register only, comment the above and comment out the below
  // const usdtCtrl = await getERC20ContractCtrl(
  //   ethProvider,
  //   usdtOwnerWallet,
  //   getTokenContractAddress("USDT"),
  //   Wasd3rSampleErc20USDT__factory,
  // )

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
    usdtCtrl.contractAddress,
    "USDT",
    await usdtCtrl.getDecimals(),
    0,
  )
  const usdtTokenKey = txreceipt.events[0].args?.[1]

  console.log("USDT owner address:", usdtOwnerWallet.address)
  console.log("Sample USDT contract address:", usdtCtrl.contractAddress)
  console.log("Sample USDT token key:", usdtTokenKey)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
