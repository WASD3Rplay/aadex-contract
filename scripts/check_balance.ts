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
import { Wasd3rSampleErc20USDT__factory } from "../src/contract/types"

const ENTRY_POINT_CONTRACT_ADDRESS = getEntryPointAddress()
const DEX_MANAGER_CONTRACT_ADDRESS = getDexManagerAddress()

const ethProvider = getEthProvider()
const adminWallet = new Wallet(getSignerSecret(), ethProvider.provider)

let _dexManagerContractCtrl: DexManagerContractCtrl
let _usdtContractCtrl: ERC20ContractCtrl
let _usdtTokenKey: string

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

const getDexNativeBalanceOf = async (addr: string): Promise<string> => {
  const dexManagerContractCtrl = await getAdminDexManagerContractCtrl()
  const balance = await dexManagerContractCtrl.getDexNativeBalanceOf(addr)
  return ethers.utils.formatEther(balance)
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

const getDexUSDTBalanceOf = async (addr: string): Promise<string> => {
  const dexManagerContractCtrl = await getAdminDexManagerContractCtrl()
  const usdtTokenKey = await getUSDTTokenKey()
  const balance = await dexManagerContractCtrl.getDexBalanceOf(addr, usdtTokenKey)
  return ethers.utils.formatUnits(balance, usdtTokenKey.split(":")[3])
}

const main = async (): Promise<void> => {
  const address = "0x75ce7aee59347612ed29ff5c249e34ed1bc17d15"

  const dexManagerContractCtrl = await getAdminDexManagerContractCtrl()
  const accountValid = await dexManagerContractCtrl.getDexAccountValid(address)
  console.info(" >>>>>>> ", accountValid)

  console.info("AA Dex Account:", address)
  const nativeBalance = await getDexNativeBalanceOf(address)
  console.info("\t * Native Balance:", nativeBalance, "ETH")
  const usdtBalance = await getDexUSDTBalanceOf(address)
  console.info("\t * USDT Balance:", usdtBalance, "USDT")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
