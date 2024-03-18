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
  let isDexManagerAdmin = await dexmanagerCtrl.isAdmin(adminAddress)
  if (isDexManagerAdmin) {
    console.log("Address", adminAddress, "is already admin!!")
    return
  }

  await dexmanagerCtrl.addAdmin(adminAddress)
  isDexManagerAdmin = await dexmanagerCtrl.isAdmin(adminAddress)

  console.log("Admin Address:", adminAddress)
  console.log("   * isAdmin:", isDexManagerAdmin)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
