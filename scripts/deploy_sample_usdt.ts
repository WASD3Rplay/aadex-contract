import { Wallet } from "ethers"

import { getSignerSecret } from "../src/config"
import { Wasd3rSampleErc20USDT__factory } from "../src/contract/types"
import { getEthProvider } from "../src/eth/provider"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()
  const usdtOwnerWallet = new Wallet(getSignerSecret(), ethProvider.provider)
  const contract = await new Wasd3rSampleErc20USDT__factory(usdtOwnerWallet).deploy()

  console.log("USDT owner address:", usdtOwnerWallet.address)
  console.log("Sample USDT contract address:", contract.address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
