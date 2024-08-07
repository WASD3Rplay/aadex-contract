import { Wallet } from "ethers"

import {
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getERC20ContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getTokenContractAddress,
} from "../../src"
import { deployERC20Contract } from "../../src/contract/erc20"
import { Wasd3rSampleErc20USDC__factory } from "../../src/contract/types"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()
  const usdcOwnerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  let isForceDeploy = false
  let forceDeploy = process.env.NODE_FORCE_DEPLOY
  if (forceDeploy) {
    forceDeploy = forceDeploy.toUpperCase()
    if (
      forceDeploy === "Y" ||
      forceDeploy === "YES" ||
      forceDeploy === "T" ||
      forceDeploy === "TRUE"
    ) {
      isForceDeploy = true
    }
  }

  let contractAddress = ""
  try {
    contractAddress = getTokenContractAddress("USDC")
  } catch (error) {
    console.log("Need to deploy new contract")
  }

  let usdcCtrl
  if (isForceDeploy || contractAddress === "") {
    usdcCtrl = await deployERC20Contract(
      ethProvider,
      usdcOwnerWallet,
      Wasd3rSampleErc20USDC__factory,
    )
  } else {
    usdcCtrl = await getERC20ContractCtrl(
      ethProvider,
      usdcOwnerWallet,
      getTokenContractAddress("USDC"),
      Wasd3rSampleErc20USDC__factory,
    )
  }

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const dexmanagerCtrl = await getDexManagerContractCtrl(
    ethProvider,
    superuserWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  // Register deployed USDC in AADex
  const txreceipt = await dexmanagerCtrl.registerDexToken(
    1,
    usdcCtrl.contractAddress,
    "USDC",
    await usdcCtrl.getDecimals(),
    0,
  )
  const usdcTokenKey = txreceipt.events[0].args?.[1]
  const isTokenValid = await dexmanagerCtrl.isValidDexToken(usdcTokenKey)

  console.log("USDC owner address:", usdcOwnerWallet.address)
  console.log("Sample USDC contract address:", usdcCtrl.contractAddress)
  console.log("Sample USDC token key:", usdcTokenKey)
  console.log("            is valid?:", isTokenValid)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
