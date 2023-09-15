import { Wallet, ethers } from "ethers"

import {
  DexManagerContractCtrl,
  ERC20ContractCtrl,
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getERC20ContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getTokenContractAddress,
} from "../src"
import {
  Wasd3rSampleErc20USDT__factory,
  Wasd3rSampleErc20WrappedETH__factory,
} from "../src/contract/types"

const ENTRY_POINT_CONTRACT_ADDRESS = getEntryPointAddress()
const DEX_MANAGER_CONTRACT_ADDRESS = getDexManagerAddress()

const ethProvider = getEthProvider()
const adminWallet = new Wallet(getSignerSecret(), ethProvider.provider)

let _dexManagerContractCtrl: DexManagerContractCtrl
let _usdtContractCtrl: ERC20ContractCtrl
let _usdtTokenKey: string
let _wethContractCtrl: ERC20ContractCtrl
let _wethTokenKey: string

const getAdminDexManagerContractCtrl = async () => {
  if (_dexManagerContractCtrl === undefined) {
    _dexManagerContractCtrl = await getDexManagerContractCtrl(
      ethProvider,
      adminWallet,
      ENTRY_POINT_CONTRACT_ADDRESS,
      DEX_MANAGER_CONTRACT_ADDRESS,
    )
  }
  return _dexManagerContractCtrl
}

const getAdminUSDTContractCtrl = async () => {
  if (_usdtContractCtrl === undefined) {
    _usdtContractCtrl = await getERC20ContractCtrl(
      ethProvider,
      adminWallet,
      getTokenContractAddress("USDT"),
      Wasd3rSampleErc20USDT__factory,
    )
  }
  return _usdtContractCtrl
}

const getUSDTTokenKey = async (): Promise<string> => {
  if (_usdtTokenKey === undefined) {
    const dexManagerContractCtrl = await getAdminDexManagerContractCtrl()
    const usdtContractCtrl = await getAdminUSDTContractCtrl()
    _usdtTokenKey = await dexManagerContractCtrl.getTokenKey(
      1,
      usdtContractCtrl.contractAddress,
      await usdtContractCtrl.getDecimals(),
      0,
    )
  }
  return _usdtTokenKey
}

const getDexNativeBalanceOf = async (addr: string): Promise<string> => {
  const dexManagerContractCtrl = await getAdminDexManagerContractCtrl()
  const balance = await dexManagerContractCtrl.getDexNativeBalanceOf(addr)
  return ethers.utils.formatEther(balance)
}

const getDexUSDTBalanceOf = async (addr: string): Promise<string> => {
  const dexManagerContractCtrl = await getAdminDexManagerContractCtrl()
  const usdtTokenKey = await getUSDTTokenKey()
  const balance = await dexManagerContractCtrl.getDexBalanceOf(addr, usdtTokenKey)
  return ethers.utils.formatUnits(balance, usdtTokenKey.split(":")[3])
}

const getAdminWETHContractCtrl = async () => {
  if (_wethContractCtrl === undefined) {
    _wethContractCtrl = await getERC20ContractCtrl(
      ethProvider,
      adminWallet,
      getTokenContractAddress("WETH"),
      Wasd3rSampleErc20WrappedETH__factory,
    )
  }
  return _wethContractCtrl
}

const getWETHTokenKey = async (): Promise<string> => {
  if (_wethTokenKey === undefined) {
    const dexManagerContractCtrl = await getAdminDexManagerContractCtrl()
    const wethContractCtrl = await getAdminWETHContractCtrl()
    _wethTokenKey = await dexManagerContractCtrl.getTokenKey(
      1,
      wethContractCtrl.contractAddress,
      await wethContractCtrl.getDecimals(),
      0,
    )
  }
  return _wethTokenKey
}

const getDexWETHBalanceOf = async (addr: string): Promise<string> => {
  const dexManagerContractCtrl = await getAdminDexManagerContractCtrl()
  const wethTokenKey = await getWETHTokenKey()
  const balance = await dexManagerContractCtrl.getDexBalanceOf(addr, wethTokenKey)
  return ethers.utils.formatUnits(balance, wethTokenKey.split(":")[3])
}

const printAccountBalances = async (userAddress: string) => {
  // in EOA
  const nativeBalance = await ethProvider.getBalance(userAddress)
  const usdtContractCtrl = await getAdminUSDTContractCtrl()
  const usdtBalance = await usdtContractCtrl.balanceOf(userAddress)
  const wethContractCtrl = await getAdminWETHContractCtrl()
  const wethBalance = await wethContractCtrl.balanceOf(userAddress)

  // in DEX
  const nativeBalanceInDex = await getDexNativeBalanceOf(userAddress)
  const usdtBalanceInDex = await getDexUSDTBalanceOf(userAddress)
  const wethBalanceInDex = await getDexWETHBalanceOf(userAddress)

  console.info("AA Dex User:", userAddress)

  console.info("\t(EOA)")
  console.info("\t    * Native Balance:", nativeBalance, "ETH")
  console.info("\t    * USDT Balance:  ", usdtBalance, "USDT")
  console.info("\t    * WETH Balance:  ", wethBalance, "WETH")

  console.info("\t(DEX)")
  console.info("\t    * Native Balance:", nativeBalanceInDex, "ETH")
  console.info("\t    * USDT Balance:  ", usdtBalanceInDex, "USDT")
  console.info("\t    * WETH Balance:  ", wethBalanceInDex, "WETH")
}

const main = async (): Promise<void> => {
  const userAddress = "0xFDefc04Ed449Bf48F59618E84d4cA118162cd5a3"
  await printAccountBalances(userAddress)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
