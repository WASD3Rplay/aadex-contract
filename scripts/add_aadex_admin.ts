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
  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const dexmanagerCtrl = await getDexManagerContractCtrl(
    ethProvider,
    superuserWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  // Register deployed USDT in AADex
  const txreceipt = await dexmanagerCtrl.addAdmin(
    "0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15",
  )
  console.log("Tx Hash:", txreceipt.txhash)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
