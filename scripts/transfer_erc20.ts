import { Wallet, ethers } from "ethers"

import {
  getERC20ContractCtrl,
  getEthProvider,
  getSignerSecret,
  getToAddress,
  getTokenContractAddress,
  getTokenSymbol,
} from "../src"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const toAddr = getToAddress()
  if (!toAddr) {
    throw new Error("Need to set NODE_TO_ADDRESS")
  }

  const tokenSymbol = getTokenSymbol()
  let contractAddress
  try {
    contractAddress = getTokenContractAddress(tokenSymbol)
  } catch (error) {
    throw new Error(`Need to deploy the token (${tokenSymbol}) first: ${error}`)
  }

  const signerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const tokenContractCtrl = await getERC20ContractCtrl(
    ethProvider,
    signerWallet,
    contractAddress,
  )
  await tokenContractCtrl.transferToken(toAddr, "10000")
  const balance = await tokenContractCtrl.balanceOf(toAddr)

  console.log(`${tokenSymbol} token owner address:`, toAddr)
  console.log(`${tokenSymbol} token owner's balance:`, balance, tokenSymbol)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
