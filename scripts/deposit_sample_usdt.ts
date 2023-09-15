import { ethers } from "ethers"

import {
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getERC20ContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getTokenContractAddress,
} from "../src"
import { Wasd3rSampleErc20USDT__factory } from "../src/contract/types"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()

  const signerWallet = ethProvider.loadWallet(getSignerSecret())

  const usdtContract = await getERC20ContractCtrl(
    ethProvider,
    signerWallet,
    getTokenContractAddress("USDT"),
    Wasd3rSampleErc20USDT__factory,
  )

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    signerWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  const usdtApprovee = dexManagerContractCtrl.contractAddress
  console.log("USDT approved to:", usdtApprovee)

  const receipt = await usdtContract.approve(usdtApprovee, "100") // 100 USDT
  console.log("USDT approved result:", receipt)

  const usdtDecimals = await usdtContract.getDecimals()
  const usdtTokenKey = await dexManagerContractCtrl.getTokenKey(
    1,
    usdtContract.contractAddress,
    usdtDecimals,
    0,
  )

  const receipt2 = await dexManagerContractCtrl.depositDexToken(
    signerWallet.address,
    usdtTokenKey,
    ethers.utils.parseUnits("100", usdtDecimals), // 100 USDT
  )
  console.log("USDT deposit result:", receipt2)

  console.log("USDT owner address:", signerWallet.address)
  console.log("Sample USDT contract address:", usdtContract.contractAddress)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
