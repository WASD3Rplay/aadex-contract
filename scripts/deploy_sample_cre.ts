import { Wallet } from "ethers"

import {
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getERC20ContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getTokenContractAddress,
} from "../src"
import { ERC20ContractCtrl, deployERC20Contract } from "../src/contract/erc20"
import { Wasd3rSampleErc20Decimal18Token__factory } from "../src/contract/types"

const main = async (): Promise<void> => {
  const ethProvider = getEthProvider()
  const tokenOwnerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const tokenName = "Wasd3r Demo Carry Token"
  const tokenSymbol = "CRE"

  let contractAddress = ""
  try {
    contractAddress = getTokenContractAddress(tokenSymbol)
  } catch (error) {
    console.log("Need to deploy new contract")
  }

  let tokenContractCtrl: ERC20ContractCtrl | null = null

  if (contractAddress !== "") {
    tokenContractCtrl = await getERC20ContractCtrl(
      ethProvider,
      tokenOwnerWallet,
      contractAddress,
      Wasd3rSampleErc20Decimal18Token__factory,
    )
    if (
      tokenName !== (await tokenContractCtrl.getName()) ||
      tokenSymbol !== (await tokenContractCtrl.getSymbol())
    ) {
      tokenContractCtrl = null
    }
  }

  if (tokenContractCtrl === null) {
    // Need to deploy
    tokenContractCtrl = await deployERC20Contract(
      ethProvider,
      tokenOwnerWallet,
      Wasd3rSampleErc20Decimal18Token__factory,
    )
    await tokenContractCtrl.setName(tokenName)
    await tokenContractCtrl.setSymbol(tokenSymbol)
    contractAddress = tokenContractCtrl.contractAddress
  }

  const superuserWallet = new Wallet(getSignerSecret(), ethProvider.provider)

  const dexmanagerCtrl = await getDexManagerContractCtrl(
    ethProvider,
    superuserWallet,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  let tokenKey = await dexmanagerCtrl.getTokenKey(1, contractAddress, 18, 0)
  const isValidDexToken = await dexmanagerCtrl.isValidDexToken(tokenKey)

  if (!isValidDexToken) {
    // Register deployed USDT in AADex
    const txreceipt = await dexmanagerCtrl.registerDexToken(
      1,
      tokenContractCtrl.contractAddress,
      "WETH",
      await tokenContractCtrl.getDecimals(),
      0,
    )

    tokenKey = txreceipt.events[0].args?.[1]
  }

  console.log(`${tokenSymbol} owner address:`, tokenOwnerWallet.address)
  console.log(
    `Sample ${tokenSymbol} contract address:`,
    tokenContractCtrl.contractAddress,
  )
  console.log(`Sample ${tokenSymbol} token key:`, tokenKey)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
