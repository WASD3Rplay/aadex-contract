import { Wallet } from "ethers"

import {
  getAmount,
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
  const amount = getAmount()
  await tokenContractCtrl.transferToken(toAddr, amount)
  const balance = await tokenContractCtrl.balanceOf(toAddr)

  console.log(`${tokenSymbol} token owner address:`, toAddr)
  console.log(`${tokenSymbol} token owner's balance:`, balance, tokenSymbol)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
