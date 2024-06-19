import { Wallet } from "ethers"

import {
  getEthBalance,
  getEthProvider,
  getSignerSecret,
  getToAddress,
  getAmount,
  transferEth,
} from "../src"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const toAddr = getToAddress()

  const signerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const amount = getAmount()
  await transferEth(signerWallet, toAddr, amount)
  const fromBalance = await getEthBalance(ethProvider, signerWallet.address)
  const toBalance = await getEthBalance(ethProvider, toAddr)

  console.log("Native Token Transfer ....")
  console.log("FROM address:", signerWallet.address)
  console.log("FROM balance:", fromBalance, "ETH")
  console.log("TO address:", toAddr)
  console.log("TO balance:", toBalance, "ETH")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
