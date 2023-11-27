import { BigNumber, Signer, Wallet, ethers } from "ethers"

import {
  AADexManagerContractCtrl,
  AASigner,
  DexManagerContractCtrl,
  DexOrderType,
  ERC20ContractCtrl,
  SendUserOpsFunc,
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
}

const main = async (): Promise<void> => {
  console.info("Before deposit ..........")
  await printAccountBalances()
  console.info("")

  // Alice deposits 10 ETH
  await depositNativeToken(aliceWallet, "10", "10")
  // Bill deposits 2000 USDT
  await depositUSDT(billWallet, "15000", "10000")

  console.info("After deposit ..........")
  await printAccountBalances()
  console.info("")

  // Bill wants to buy 0.1 ETH
  // which price is 1 ETH for 1200 USDT.
  const buyLimitOrder1 = await createDexOrder(
    billWallet,
    1,
    DexOrderType.BUY_LIMIT,
    "1200",
    "0.1",
  )
  console.info("buy limit order by Bill", billWallet.address, buyLimitOrder1)

  // Alice wants to sell 1 ETH for 1000 USDT,
  // which price is 1 ETH for 1000 USDT.
  const sellLimitOrder = await createDexOrder(
    aliceWallet,
    2,
    DexOrderType.SELL_LIMIT,
    "1000",
    "1",
  )
  console.info("sell limit order by Alice", aliceWallet.address, sellLimitOrder)

  // Bill wants to buy 0.05 ETH
  // which price is 1 ETH for 1100 USDT.
  const buyLimitOrder2 = await createDexOrder(
    billWallet,
    3,
    DexOrderType.BUY_LIMIT,
    "1100",
    "0.05",
  )
  console.info("buy limit order by Bill", billWallet.address, buyLimitOrder2)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
