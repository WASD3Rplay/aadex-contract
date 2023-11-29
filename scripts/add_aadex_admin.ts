import { Wallet } from "ethers"

import {
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

  // >>>> DEV
  // const adminAddress = "0x5BF04B71a94c046d283FD0Cd821197f19aC577B4"
  // >>>> STAGING
  const adminAddress = "0x1478AAFb174E2D8e83411fF4c191AAdeB1603661"

  const txreceipt = await dexmanagerCtrl.addAdmin(adminAddress)
  console.log("Admin Address:", adminAddress)
  console.log("Tx Hash:", txreceipt.txhash)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
