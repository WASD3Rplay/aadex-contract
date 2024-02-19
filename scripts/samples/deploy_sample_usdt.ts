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
import { Wasd3rSampleErc20USDT__factory } from "../../src/contract/types"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()
  const usdtOwnerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

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
    contractAddress = getTokenContractAddress("USDT")
  } catch (error) {
    console.log("Need to deploy new contract")
  }

  let usdtCtrl
  if (isForceDeploy || contractAddress === "") {
    usdtCtrl = await deployERC20Contract(
      ethProvider,
      usdtOwnerWallet,
      Wasd3rSampleErc20USDT__factory,
    )
  } else {
    usdtCtrl = await getERC20ContractCtrl(
      ethProvider,
      usdtOwnerWallet,
      getTokenContractAddress("USDT"),
      Wasd3rSampleErc20USDT__factory,
    )
  }

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const dexmanagerCtrl = await getDexManagerContractCtrl(
    ethProvider,
    superuserWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  // Register deployed USDT in AADex
  const txreceipt = await dexmanagerCtrl.registerDexToken(
    1,
    usdtCtrl.contractAddress,
    "USDT",
    await usdtCtrl.getDecimals(),
    0,
  )
  const usdtTokenKey = txreceipt.events[0].args?.[1]
  const isTokenValid = await dexmanagerCtrl.isValidDexToken(usdtTokenKey)

  console.log("USDT owner address:", usdtOwnerWallet.address)
  console.log("Sample USDT contract address:", usdtCtrl.contractAddress)
  console.log("Sample USDT token key:", usdtTokenKey)
  console.log("            is valid?:", isTokenValid)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
