import { Wallet } from "ethers"

import {
  getAdminAddress,
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
} from "../src"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()
  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const dexmanagerCtrl = await getDexManagerContractCtrl(
    ethProvider,
    superuserWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  const adminAddress = getAdminAddress()

  const txreceipt = await dexmanagerCtrl.addAdmin(adminAddress)
  console.log("Admin Address:", adminAddress)
  console.log("Tx Hash:", txreceipt.txhash)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
