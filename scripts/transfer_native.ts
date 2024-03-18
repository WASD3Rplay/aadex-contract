import { Wallet } from "ethers"

import {
  getEthBalance,
  getEthProvider,
  getSignerSecret,
  getToAddress,
  transferEth,
} from "../src"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const toAddr = getToAddress()

  const signerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  await transferEth(signerWallet, toAddr, "100")
  const balance = await getEthBalance(ethProvider, toAddr)

  console.log("Native token owner address:", toAddr)
  console.log("Native token owner's balance:", balance, "ETH")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
