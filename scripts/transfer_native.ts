import { Wallet } from "ethers"

import { getEthBalance, getEthProvider, getSignerSecret, transferEth } from "../src"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const toAddr = process.env.NODE_TO_ADDRESS
  if (!toAddr) {
    throw new Error("Need to set NODE_TO_ADDRESS")
  }

  const signerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  await transferEth(signerWallet, toAddr, "10")
  const balance = await getEthBalance(ethProvider, toAddr)

  console.log("Native token owner address:", toAddr)
  console.log("Native token owner's balance:", balance, "ETH")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
