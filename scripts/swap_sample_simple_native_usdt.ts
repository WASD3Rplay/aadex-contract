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
  getDexManagerAddress,
  getDexManagerContractCtrl,
  getERC20ContractCtrl,
  getEntryPointAddress,
  getEthProvider,
  getSignerSecret,
  getTokenContractAddress,
  transferEth,
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
let _nativeTokenKey: string
let _usdtContractCtrl: ERC20ContractCtrl
let _usdtTokenKey: string
let _usdtDecimals: number
let _wethContractCtrl: ERC20ContractCtrl
let _wethTokenKey: string
let _wethDecimals: number

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

  // approves transferring USDT to AA Dex.
  const txreceipt2 = await usdtContract.approve(
    dexManagerContractCtrl.contractAddress,
    amount,
  )
  //console.debug("\t* USDT approval tx hash:", txreceipt2.txhash)

  const usdtTokenKey = await getUSDTTokenKey()

  // deposits USDT
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
  console.debug("\t* USDT balance in AA Dex:", balance, "USDT")
}

const localUserOpsSender = (signer: Signer, beneficiary?: string): SendUserOpsFunc => {
  const entryPoint = Wasd3rDexEntryPoint__factory.connect(
    ENTRY_POINT_CONTRACT_ADDRESS,
    signer,
  )

  return async function (maxPriorityFeePerGas, maxFeePerGas, userOps) {
    console.log(" !!!! ", {
      s2: `${maxPriorityFeePerGas}`,
      s3: `${maxFeePerGas}`,
    })
    for (let i = 0; i < userOps.length; i++) {
      const userOp = userOps[i]
      console.log(" >>>>>> ", {
        preVGs: `${userOp.preVerificationGas}`,
        vgls: `${userOp.verificationGasLimit}`,
        cgls: `${userOp.callGasLimit}`,
        mpfpgs: `${userOp.maxPriorityFeePerGas}`,
        mfpgs: `${userOp.maxFeePerGas}`,
      })
    }

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
    ethProvider,
    signer,
    usdtContractAddress,
    Wasd3rSampleErc20USDT__factory,
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

const printAccountBalances = async () => {
  console.info("AA Dex Admin:", adminWallet.address)

  const adminNativeBalance = ethers.utils.formatEther(await adminWallet.getBalance())
  console.info("\t * (EOA) Native Balance:", adminNativeBalance, "ETH")

  const adminNativeBalanceInDex = await getDexNativeBalanceOf(adminWallet.address)
  console.info("\t * (DEX) Native Balance:", adminNativeBalanceInDex, "ETH")

  const usdtContractCtrl = await getAdminUSDTContractCtrl()
  const adminUSDTBalance = await usdtContractCtrl.balanceOf(adminWallet.address)
  console.info("\t * (EOA) USDT Balance:", adminUSDTBalance, "USDT")

  const adminUSDTBalanceInDex = await getDexUSDTBalanceOf(adminWallet.address)
  console.info("\t * (DEX) USDT Balance:", adminUSDTBalanceInDex, "USDT")

  const wethContractCtrl = await getAdminWETHContractCtrl()
  const adminWETHBalance = await wethContractCtrl.balanceOf(adminWallet.address)
  console.info("\t * (EOA) WETH Balance:", adminWETHBalance, "WETH")

  const adminWETHBalanceInDex = await getDexWETHBalanceOf(adminWallet.address)
  console.info("\t * (DEX) WETH Balance:", adminWETHBalanceInDex, "WETH")
}

const main = async (): Promise<void> => {
  /*
  try {
    const txhash = "0x5a9e17335cd06f45afb4e11571dd0a27b45173994a38c7548009e9f4fe6ed1d3"
    const tx123 = await ethProvider.getTx(txhash)
    //console.log(tx123)
    let txreceipt123 = await ethProvider.waitForTx(txhash)
    console.log("Wait For TX:", txreceipt123)
    //console.log(txreceipt123.receipt)
    //console.log(`${txreceipt123.receipt.gasUsed}`)
    //txreceipt123 = await ethProvider.getTxReceipt(txhash)
    //console.log(txreceipt123)
  } catch (error: any) {
    let txreceipt123 = error.receipt
    console.log(txreceipt123)
    console.log(`${txreceipt123.gasUsed}`, `${txreceipt123.cumulativeGasUsed}`)
  }
  return

  console.info("Before deposit ..........")
  await printAccountBalances()
  console.info("")
  return
  */

  console.info("Before deposit ..........")
  await printAccountBalances()

  // deposits ETH
  await depositNativeToken(adminWallet, "0.01")
  // deposits USDT
  await depositUSDT(adminWallet, "2000")

  console.info("After deposit ..........")
  await printAccountBalances()
  console.info("")

  const aadexManagerContractCtrl = await getAADexManagerContractCtrl()

  // buy 0.1 ETH for 120 USDT
  const dexOrder1 = await createDexOrder(
    adminWallet,
    1,
    DexOrderType.BUY,
    "1200",
    "0.1",
  )

  // sell 0.01 ETH for 1000 USDT,
  const dexOrder2 = await createDexOrder(
    adminWallet,
    2,
    DexOrderType.SELL,
    "1000",
    "0.01",
  )

  const tradeId = 1000
  const usdtDecimals = await getUSDTDecimals()

  const baseTickerTokenkey = await getNativeTokenKey()
  const quoteTickerTokenKey = await getUSDTTokenKey()

  // Add swap1 (trade item 1)
  const tradeItem1Id = 100
  const swap1BuyerFee = ethers.utils.parseEther("0.0001")
  const swap1SellerFee = ethers.utils.parseUnits("0.12", usdtDecimals)
  // Alice will sell `swap1BaseAmount` and Bill will get `swap1BaseAmount`.
  const swap1BaseAmount = ethers.utils.parseEther("0.01")
  // Alice will get `swap1QuoteAmount` and Bill will pay `swap1QuoteAmount`.
  const swap1QuoteAmount = ethers.utils.parseUnits("12", usdtDecimals)
  await aadexManagerContractCtrl.swap(
    tradeId,
    tradeItem1Id,
    dexOrder1, // buy order
    adminWallet.address, // buyer address
    swap1BuyerFee, // buyer fee
    dexOrder2, // sell order
    adminWallet.address, // seller address
    swap1SellerFee, // seller fee
    baseTickerTokenkey,
    swap1BaseAmount,
    quoteTickerTokenKey,
    swap1QuoteAmount,
    adminWallet.address,
  )

  const tx = await aadexManagerContractCtrl.sendUserOps()
  const txreceipt = new TxReceipt(await tx.wait())
  console.debug("SwapUserOps Tx receipt:", txreceipt)

  console.info("After swap ..........")
  await printAccountBalances()
  console.info("")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
