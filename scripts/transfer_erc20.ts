import { Wallet, ethers } from "ethers"

import {
  getERC20ContractCtrl,
  getEthProvider,
  getSignerSecret,
  getTokenContractAddress,
} from "../src"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const toAddr = process.env.NODE_TO_ADDRESS
  if (!toAddr) {
    throw new Error("Need to set NODE_TO_ADDRESS")
  }

  const tokenSymbol = process.env.NODE_TOKEN_SYMBOL
  if (!tokenSymbol) {
    throw new Error("Need to set NODE_TOKEN_SYMBOL")
  }

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
  await tokenContractCtrl.transferToken(toAddr, "1000")
  const balance = await tokenContractCtrl.balanceOf(toAddr)

  console.log(`${tokenSymbol} token owner address:`, toAddr)
  console.log(`${tokenSymbol} token owner's balance:`, balance, tokenSymbol)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
