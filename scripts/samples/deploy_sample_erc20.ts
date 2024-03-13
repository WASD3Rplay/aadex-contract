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
import { ERC20ContractCtrl, deployERC20Contract } from "../../src/contract/erc20"
import { Wasd3rSampleErc20Decimal18Token__factory } from "../../src/contract/types"

const findOrDeployDecimal18Contract = async (
  tokenName: string,
  tokenSymbol: string,
): Promise<void> => {
  const ethProvider = getEthProvider()
  const tokenOwnerWallet = new Wallet(getSignerSecret(), ethProvider.provider)

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
    contractAddress = getTokenContractAddress(tokenSymbol)
  } catch (error) {
    console.log("Need to deploy new contract")
  }

  let tokenContractCtrl: ERC20ContractCtrl | null = null

  if (isForceDeploy || contractAddress === "") {
    // Need to deploy
    tokenContractCtrl = await deployERC20Contract(
      ethProvider,
      tokenOwnerWallet,
      Wasd3rSampleErc20Decimal18Token__factory,
    )
    await tokenContractCtrl.setName(tokenName)
    await tokenContractCtrl.setSymbol(tokenSymbol)
    contractAddress = tokenContractCtrl.contractAddress
  } else {
    tokenContractCtrl = await getERC20ContractCtrl(
      ethProvider,
      tokenOwnerWallet,
      contractAddress,
      Wasd3rSampleErc20Decimal18Token__factory,
    )

    const name = await tokenContractCtrl.getName()
    const symbol = await tokenContractCtrl.getSymbol()
    if (tokenName !== name || tokenSymbol !== symbol) {
      throw new Error(
        `Exist contract (${contractAddress}) is different token: ${symbol} (${name})`,
      )
    }
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
      tokenSymbol,
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
  console.log("            is valid?:", isValidDexToken)
}

export default findOrDeployDecimal18Contract
