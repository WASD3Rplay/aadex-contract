import { Wallet } from "ethers"

import {
  getAmount,
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
  const fromBalance = await getEthBalance(ethProvider, signerWallet.address)

  console.log("Native Token Transfer ....")
  console.log("FROM address:", signerWallet.address)
  console.log("FROM balance:", fromBalance, "ETH")

  const amount = getAmount()
  await transferEth(signerWallet, toAddr, amount)
  const toBalance = await getEthBalance(ethProvider, toAddr)
  console.log("TO address:", toAddr)
  console.log("TO balance:", toBalance, "ETH")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
