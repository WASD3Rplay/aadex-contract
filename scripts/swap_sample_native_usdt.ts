import { BigNumber, Signer, Wallet, ethers } from "ethers"

import {
  AADexManagerContractCtrl,
  AASigner,
  DexManagerContractCtrl,
  DexOrderType,
  ERC20ContractCtrl,
  SendUserOpsFunc,
  TxReceipt,
  Wasd3rDexEntryPoint__factory,
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
const billWallet = new Wallet(getAccountSecret("BILL"), ethProvider.provider)
const carlWallet = new Wallet(getAccountSecret("CARL"), ethProvider.provider)
const daisyWallet = new Wallet(getAccountSecret("DAISY"), ethProvider.provider)

let _dexManagerContractCtrl: DexManagerContractCtrl
let _nativeTokenKey: string
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

const getAdminUSDTContractCtrl = async () => {
  if (_usdtContractCtrl === undefined) {
    _usdtContractCtrl = await getERC20ContractCtrl(
      Wasd3rSampleErc20USDT__factory,
      ethProvider,
      adminWallet,
      getTokenContractAddress("USDT"),
    )
  }
  return _usdtContractCtrl
}

const getNativeTokenKey = async (): Promise<string> => {
  if (_nativeTokenKey === undefined) {
    const dexManagerContractCtrl = await getAdminDexManagerContractCtrl()
    _nativeTokenKey = await dexManagerContractCtrl.getNativeTokenKey()
  }
  return _nativeTokenKey
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

const getUSDTDecimals = async (): Promise<number> => {
  if (_usdtDecimals === undefined) {
    const usdtContractCtrl = await getAdminUSDTContractCtrl()
    _usdtDecimals = await usdtContractCtrl.getDecimals()
  }
  return _usdtDecimals
}

const depositNativeToken = async (signer: Wallet, amount: string): Promise<void> => {
  //console.debug(`Account (${signer.address}):`)

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

const depositUSDT = async (signer: Wallet, amount: string): Promise<void> => {
  //console.debug(`Account (${signer.address}):`)

  const usdtContract = await getERC20ContractCtrl(
    Wasd3rSampleErc20USDT__factory,
    ethProvider,
    signer,
    getTokenContractAddress("USDT"),
  )

  const dexManagerContractCtrl = await getDexManagerContractCtrl(
    ethProvider,
    signer,
    getEntryPointAddress(),
    getDexManagerAddress(),
  )

  // Bill mints USDT
  const txreceipt = await usdtContract.mintToken(signer.address, amount)
  //console.debug("\t* mint USDT tx hash:", txreceipt.txhash)

  // Bill approves transferring USDT to AA Dex.
  const txreceipt2 = await usdtContract.approve(
    dexManagerContractCtrl.contractAddress,
    amount,
  )
  //console.debug("\t* USDT approval tx hash:", txreceipt2.txhash)

  const usdtTokenKey = await getUSDTTokenKey()

  // Bill deposits 10 ETH
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

const localUserOpsSender = (signer: Signer, beneficiary?: string): SendUserOpsFunc => {
  const entryPoint = Wasd3rDexEntryPoint__factory.connect(
    ENTRY_POINT_CONTRACT_ADDRESS,
    signer,
  )

  return async function (maxPriorityFeePerGas, maxFeePerGas, userOps) {
    const tx = await entryPoint.handleOps(
      userOps,
      beneficiary ?? (await signer.getAddress()),
      {
        maxPriorityFeePerGas,
        maxFeePerGas,
      },
    )
    return tx
  }
}

const getAADexManagerContractCtrl = async (): Promise<AADexManagerContractCtrl> => {
  const dexManagerContractCtrl = await getAdminDexManagerContractCtrl()

  const sendUserOpsFunc = localUserOpsSender(adminWallet)

  const senderAANonce = await dexManagerContractCtrl.getNonce()
  const maxCallGasLimit = 80000 * 6
  const aasigner = new AASigner(
    ethProvider,
    await ethProvider.getChainId(),
    adminWallet,
    DEX_MANAGER_CONTRACT_ADDRESS,
    senderAANonce,
    ENTRY_POINT_CONTRACT_ADDRESS,
    sendUserOpsFunc,
    await ethProvider.getBaseFeePerGas(),
    BigNumber.from(maxCallGasLimit),
  )

  return new AADexManagerContractCtrl(
    ethProvider,
    DEX_MANAGER_CONTRACT_ADDRESS,
    aasigner,
  )
}

const createDexOrder = async (
  signer: Wallet,
  orderId: number,
  orderType: DexOrderType,
  price: string,
  requestAmount: string,
): Promise<any> => {
  const nativeTokenContractAddress = ZERO_ADDRESS
  const usdtContractAddress = getTokenContractAddress("USDT")

  const usdtContract = await getERC20ContractCtrl(
    Wasd3rSampleErc20USDT__factory,
    ethProvider,
    signer,
    usdtContractAddress,
  )
  const usdtDecimals = await usdtContract.getDecimals()

  const orderPrice = ethers.utils.parseUnits(price, usdtDecimals)
  const orderRequestAmount = ethers.utils.parseEther(requestAmount)

  return await createNSignDexOrder(
    await ethProvider.getChainId(),
    getDexManagerAddress(),
    signer,
    orderId,
    orderType,
    nativeTokenContractAddress,
    usdtContractAddress,
    orderPrice,
    orderRequestAmount,
  )
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

const printAccountBalances = async () => {
  console.info("AA Dex Admin:", adminWallet.address)
  const adminNativeBalance = await getDexNativeBalanceOf(adminWallet.address)
  console.info("\t * Native Balance:", adminNativeBalance, "ETH")
  const adminUSDTBalance = await getDexUSDTBalanceOf(adminWallet.address)
  console.info("\t * USDT Balance:", adminUSDTBalance, "USDT")

  console.info("Alice:", aliceWallet.address)
  const aliceNativeBalance = await getDexNativeBalanceOf(aliceWallet.address)
  console.info("\t * Native Balance:", aliceNativeBalance, "ETH")
  const aliceUSDTBalance = await getDexUSDTBalanceOf(aliceWallet.address)
  console.info("\t * USDT Balance:", aliceUSDTBalance, "USDT")

  console.info("Bill:", billWallet.address)
  const billNativeBalance = await getDexNativeBalanceOf(billWallet.address)
  console.info("\t * Native Balance:", billNativeBalance, "ETH")
  const billUSDTBalance = await getDexUSDTBalanceOf(billWallet.address)
  console.info("\t * USDT Balance:", billUSDTBalance, "USDT")

  console.info("Carl:", carlWallet.address)
  const carlNativeBalance = await getDexNativeBalanceOf(carlWallet.address)
  console.info("\t * Native Balance:", carlNativeBalance, "ETH")
  const carlUSDTBalance = await getDexUSDTBalanceOf(carlWallet.address)
  console.info("\t * USDT Balance:", carlUSDTBalance, "USDT")

  console.info("Daisy:", daisyWallet.address)
  const daisyNativeBalance = await getDexNativeBalanceOf(daisyWallet.address)
  console.info("\t * Native Balance:", daisyNativeBalance, "ETH")
  const daisyUSDTBalance = await getDexUSDTBalanceOf(daisyWallet.address)
  console.info("\t * USDT Balance:", daisyUSDTBalance, "USDT")
}

const main = async (): Promise<void> => {
  console.info("Before deposit ..........")
  await printAccountBalances()
  console.info("")

  // Alice deposits 10 ETH
  await depositNativeToken(aliceWallet, "10")
  // Bill deposits 2000 USDT
  await depositUSDT(billWallet, "2000")
  // Carl deposits 10 ETH
  await depositNativeToken(carlWallet, "20")
  // Daisy deposits 2000 USDT
  await depositUSDT(daisyWallet, "5000")

  console.info("After deposit ..........")
  await printAccountBalances()
  console.info("")

  const aadexManagerContractCtrl = await getAADexManagerContractCtrl()

  // Bill wants to buy 0.1 ETH for 120 USDT
  // which price is 1 ETH for 1200 USDT.
  const dexOrder1 = await createDexOrder(billWallet, 1, DexOrderType.BUY, "1200", "0.1")

  // Alice wants to sell 1 ETH for 1000 USDT,
  // which price is 1 ETH for 1000 USDT.
  const dexOrder2 = await createDexOrder(aliceWallet, 2, DexOrderType.SELL, "1000", "1")

  // Bill wants to buy 0.4 ETH for 440 USDT
  // which price is 1 ETH for 1100 USDT.
  const dexOrder3 = await createDexOrder(billWallet, 3, DexOrderType.BUY, "1100", "0.4")

  // Carl wants to sell 2 ETH for 2200 USDT,
  // which price is 1 ETH for 1100 USDT.
  const dexOrder4 = await createDexOrder(carlWallet, 4, DexOrderType.SELL, "1100", "2")

  // Daisy wants to buy 1 ETH for 1200 USDT
  // which price is 1 ETH for 1200 USDT.
  const dexOrder5 = await createDexOrder(daisyWallet, 5, DexOrderType.BUY, "1200", "1")

  const tradeId = 1000
  const usdtDecimals = await getUSDTDecimals()

  const baseTickerTokenkey = await getNativeTokenKey()
  const quoteTickerTokenKey = await getUSDTTokenKey()

  // Add swap1 (trade item 1)
  const tradeItem1Id = 100
  const swap1BuyerFee = ethers.utils.parseEther("0.001") // 0.001 ETH
  const swap1SellerFee = ethers.utils.parseUnits("1.2", usdtDecimals) // 1.2 USDT
  // Alice will sell `swap1BaseAmount` and Bill will get `swap1BaseAmount`.
  const swap1BaseAmount = ethers.utils.parseEther("0.1") // 0.1 ETH
  // Alice will get `swap1QuoteAmount` and Bill will pay `swap1QuoteAmount`.
  const swap1QuoteAmount = ethers.utils.parseUnits("120", usdtDecimals) // 120 USDT
  await aadexManagerContractCtrl.swap(
    tradeId,
    tradeItem1Id,
    dexOrder1, // buy order
    billWallet.address, // buyer address
    swap1BuyerFee, // buyer fee
    dexOrder2, // sell order
    aliceWallet.address, // seller address
    swap1SellerFee, // seller fee
    baseTickerTokenkey,
    swap1BaseAmount,
    quoteTickerTokenKey,
    swap1QuoteAmount,
    adminWallet.address,
  )

  // Add swap2 (trade item 2)
  const tradeItem2Id = 101
  const swap2BuyerFee = ethers.utils.parseEther("0.004") // 0.004 ETH
  const swap2SellerFee = ethers.utils.parseUnits("4", usdtDecimals) // 4 USDT
  // Alice will sell `swap2BaseAmount` and Bill will get `swap2BaseAmount`.
  const swap2BaseAmount = ethers.utils.parseEther("0.4") // 0.4 ETH
  // Alice will get `swap2QuoteAmount` and Bill will pay `swap2QuoteAmount`.
  const swap2QuoteAmount = ethers.utils.parseUnits("400", usdtDecimals) // 400 USDT
  await aadexManagerContractCtrl.swap(
    tradeId,
    tradeItem2Id,
    dexOrder3,
    billWallet.address,
    swap2BuyerFee,
    dexOrder2,
    aliceWallet.address,
    swap2SellerFee,
    baseTickerTokenkey,
    swap2BaseAmount,
    quoteTickerTokenKey,
    swap2QuoteAmount,
    adminWallet.address,
  )

  // Add swap3 (trade item 3)
  const tradeItem3Id = 102
  const swap3BuyerFee = ethers.utils.parseEther("0.01")
  const swap3SellerFee = ethers.utils.parseUnits("12", usdtDecimals)
  const swap3BaseAmount = ethers.utils.parseEther("1")
  const swap3QuoteAmount = ethers.utils.parseUnits("1200", usdtDecimals)
  await aadexManagerContractCtrl.swap(
    tradeId,
    tradeItem3Id,
    dexOrder5,
    daisyWallet.address,
    swap3BuyerFee,
    dexOrder4,
    carlWallet.address,
    swap3SellerFee,
    baseTickerTokenkey,
    swap3BaseAmount,
    quoteTickerTokenKey,
    swap3QuoteAmount,
    adminWallet.address,
  )

  const tx = await aadexManagerContractCtrl.sendUserOps()
  const txreceipt = new TxReceipt(await tx.wait())
  //console.debug("SwapUserOps Tx receipt:", txreceipt)

  // Add swap4 (trade item 4)
  const aadexManagerContractCtrl2 = await getAADexManagerContractCtrl()
  await aadexManagerContractCtrl2.swap(
    tradeId,
    tradeItem3Id + 1,
    dexOrder3,
    billWallet.address,
    swap2BuyerFee,
    dexOrder2,
    aliceWallet.address,
    swap2SellerFee,
    baseTickerTokenkey,
    swap2BaseAmount,
    quoteTickerTokenKey,
    swap2QuoteAmount,
    adminWallet.address,
  )

  const tx2 = await aadexManagerContractCtrl2.sendUserOps()
  const txreceipt2 = new TxReceipt(await tx2.wait())
  //console.debug("SwapUserOps Tx receipt:", txreceipt)

  console.info("After swap ..........")
  await printAccountBalances()
  console.info("")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
