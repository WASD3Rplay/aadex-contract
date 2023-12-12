import { BigNumber, Wallet, ethers } from "ethers"

import {
  DexManagerContractCtrl,
  DexOrderType,
  ERC20ContractCtrl,
  ZERO_ADDRESS,
  createNSignDexOrder,
  getAccountSecret,
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getERC20ContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getTokenContractAddress,
  transferEth,
} from "../src"
import { Wasd3rSampleErc20USDT__factory } from "../src/contract/types"

const ENTRY_POINT_CONTRACT_ADDRESS = getEntryPointAddress()
const DEX_MANAGER_CONTRACT_ADDRESS = getDexManagerAddress()

const ethProvider = getEthProvider()
const adminWallet = new Wallet(getSignerSecret(), ethProvider.provider)
const aliceWallet = new Wallet(getAccountSecret("ALICE"), ethProvider.provider)

let _dexManagerContractCtrl: DexManagerContractCtrl
let _usdtContractCtrl: ERC20ContractCtrl
let _usdtTokenKey: string
let _usdtDecimals: number

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

const createDexOrder = async (
  signer: Wallet,
  orderId: number,
  orderType: DexOrderType,
  price: string,
  requestAmount: BigNumber,
): Promise<any> => {
  const nativeTokenContractAddress = ZERO_ADDRESS
  const usdtContractAddress = getTokenContractAddress("USDT")

  const usdtDecimals = await getUSDTDecimals()
  const orderPrice = ethers.utils.parseUnits(price, usdtDecimals)

  return await createNSignDexOrder(
    await ethProvider.getChainId(),
    getDexManagerAddress(),
    signer,
    orderId,
    orderType,
    nativeTokenContractAddress,
    usdtContractAddress,
    orderPrice,
    requestAmount,
  )
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

const getUSDTDecimals = async (): Promise<number> => {
  if (_usdtDecimals === undefined) {
    const usdtContractCtrl = await getAdminUSDTContractCtrl()
    _usdtDecimals = await usdtContractCtrl.getDecimals()
  }
  return _usdtDecimals
}

const depositNativeToken = async (
  signer: Wallet,
  amount: string,
  max: string,
): Promise<void> => {
  //console.debug(`Account (${signer.address}):`)
  const currentBalance = await getDexNativeBalanceOf(signer.address)
  if (Number(currentBalance) > Number(max)) {
    return
  }

  // Alice deposits 10 ETH
  const txreceipt = await transferEth(signer, getDexManagerAddress(), amount)
  //console.debug("\t* deposit native token tx hash:", txreceipt.txhash)

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    signer,
    ENTRY_POINT_CONTRACT_ADDRESS,
    DEX_MANAGER_CONTRACT_ADDRESS,
  )
  const balance = await dexManagerContractCtrl.getDexNativeBalanceOf(signer.address)
  //console.debug("\t* native token balance in AA Dex:", balance, "ETH")
}

const depositUSDT = async (
  signer: Wallet,
  amount: string,
  max: string,
): Promise<void> => {
  //console.debug(`Account (${signer.address}):`)
  const currentBalance = await getDexUSDTBalanceOf(signer.address)
  if (Number(currentBalance) > Number(max)) {
    return
  }

  const usdtContract = await getERC20ContractCtrl(
    ethProvider,
    signer,
    getTokenContractAddress("USDT"),
    Wasd3rSampleErc20USDT__factory,
  )

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    signer,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  // mints USDT for gas
  const txreceipt = await usdtContract.mintToken(signer.address, amount)
  //console.debug("\t* mint USDT tx hash:", txreceipt.txhash)

  // approves transferring USDT to AA Dex.
  const txreceipt2 = await usdtContract.approve(
    dexManagerContractCtrl.contractAddress,
    amount,
  )
  //console.debug("\t* USDT approval tx hash:", txreceipt2.txhash)

  const usdtTokenKey = await getUSDTTokenKey()

  // deposits 10 ETH
  const txreceipt3 = await dexManagerContractCtrl.depositDexToken(
    signer.address,
    usdtTokenKey,
    ethers.utils.parseUnits(amount, await getUSDTDecimals()),
  )
  //console.debug("\t* deposit USDT tx hash:", txreceipt3.txhash)
  const balance = await dexManagerContractCtrl.getDexBalanceOf(
    signer.address,
    usdtTokenKey,
  )
  //console.debug("\t* USDT balance in AA Dex:", balance, "USDT")
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

const getSignedOrderJson = (order: any): any => {
  return {
    ...order,
    priceStr: order.price.toString(),
    requestAmountStr: order.requestAmount.toString(),
  }
}

const main = async (): Promise<void> => {
  const usdtDecimals = await getUSDTDecimals()

  console.info("Dex Manager Contract Address:", DEX_MANAGER_CONTRACT_ADDRESS)
  console.info("Chain ID:", await ethProvider.getChainId())
  console.info("Wallet Address:", aliceWallet.address)

  // Bill wants to buy 0.1 ETH
  // which price is 1 ETH for 1200 USDT.
  const buyLimitOrder = await createDexOrder(
    aliceWallet,
    1,
    DexOrderType.BUY_LIMIT,
    "1200",
    ethers.utils.parseEther("0.1"),
  )
  console.info("Buy Limit Order:", getSignedOrderJson(buyLimitOrder))

  // Alice wants to sell 1 ETH for 1000 USDT,
  // which price is 1 ETH for 1000 USDT.
  const sellLimitOrder = await createDexOrder(
    aliceWallet,
    2,
    DexOrderType.SELL_LIMIT,
    "1000",
    ethers.utils.parseEther("0.05"),
  )
  console.info("Sell Limit Order:", getSignedOrderJson(sellLimitOrder))

  // Bill wants to buy as much as 5000 USDT.
  const buyMarketTotalOrder = await createDexOrder(
    aliceWallet,
    3,
    DexOrderType.BUY_MARKET_TOTAL,
    "0",
    ethers.utils.parseUnits("5000", usdtDecimals),
  )
  console.info("Buy Market Total Order:", getSignedOrderJson(buyMarketTotalOrder))

  // Alice wants to sell 3 ETH.
  const sellMarketAmountOrder = await createDexOrder(
    aliceWallet,
    4,
    DexOrderType.SELL_MARKET_AMOUNT,
    "0",
    ethers.utils.parseEther("3"),
  )
  console.info("Sell Market Amount Order", getSignedOrderJson(sellMarketAmountOrder))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
