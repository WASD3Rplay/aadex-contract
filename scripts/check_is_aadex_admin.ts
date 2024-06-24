import { Wallet } from "ethers"

import {
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getToAddress,
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

  const su = await dexmanagerCtrl.getSU()
  console.log("SU address:", su)

  const isSUAdmin = await dexmanagerCtrl.isAdmin(superuserWallet.address)
  console.log("Is SU Admin:", superuserWallet.address, isSUAdmin)

  const adminAddr = getToAddress()
  const isAdmin = await dexmanagerCtrl.isAdmin(adminAddr)
  console.log(`Is ${adminAddr} Admin:`, isAdmin)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
