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

  const entryPointContractAddr = getEntryPointAddress()
  const dexManagerContractAddr = getDexManagerAddress()

  if (!entryPointContractAddr) {
    throw new Error("Cannot recognize entry point address:")
  }
  console.log("Entry Point Address:", entryPointContractAddr)

  if (!dexManagerContractAddr) {
    throw new Error("Cannot recognize dex manager address:")
  }
  console.log("Dex Manager Address:", dexManagerContractAddr)

  const dexmanagerCtrl = await getDexManagerContractCtrl(
    ethProvider,
    superuserWallet,
    entryPointContractAddr,
    dexManagerContractAddr,
  )

  const adminAddress = getAdminAddress()
  let isDexManagerAdmin = await dexmanagerCtrl.isAdmin(adminAddress)
  if (isDexManagerAdmin) {
    console.log("Address", adminAddress, "is already admin!!")
    return
  }

  await dexmanagerCtrl.addAdmin(adminAddress)
  isDexManagerAdmin = await dexmanagerCtrl.isAdmin(adminAddress)

  console.log("Dex Manager Address:", dexmanagerCtrl.contractAddress)
  console.log("Admin Address:", adminAddress)
  console.log("   * isAdmin:", isDexManagerAdmin)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
