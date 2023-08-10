import { Wallet } from "ethers"

import { getEthProvider, getSignerSecret } from "../src"
import { Wasd3rSampleErc20USDT__factory } from "../src/contract/types"

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
