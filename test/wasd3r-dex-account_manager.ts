import { expect } from "chai"
import { ethers } from "ethers"
import hre from "hardhat"

describe("Wasd3r AA Dex: Account Manager", function () {
  let suSigner
  let dexManagerContract
  let usdtContract
  let usdtTokenKey

  before("deploy the contract", async function () {
    suSigner = (await hre.ethers.getSigners())[0]
    const dexManagerContractFactory = await hre.ethers.getContractFactory(
      "Wasd3rDexManager",
      {
        signer: suSigner,
      },
    )
    dexManagerContract = await dexManagerContractFactory.deploy()
    await dexManagerContract.deployed()

    const usdtContractFactory = await hre.ethers.getContractFactory(
      "Wasd3rSampleErc20USDT",
      {
        signer: suSigner,
      },
    )
    usdtContract = await usdtContractFactory.deploy()
    await usdtContract.deployed()

    await dexManagerContract.registerDexToken(1, usdtContract.address, 0, 6, "USDT")
    usdtTokenKey = await dexManagerContract.getTokenKey(
      1, // ERC20
      usdtContract.address,
      0,
      6,
    )
  })

  it("Should deposit native token", async function () {
    const nativeTokenKey = await dexManagerContract.DEX_TOKEN_NATIVE_TOKEN_KEY()

    let dexBalance = await dexManagerContract.getDexNativeBalanceOf(suSigner.address)
    expect(dexBalance).to.equal(BigInt("0"))

    // Check deposit info
    let depositInfo = await dexManagerContract.getDexDepositInfo(
      suSigner.address,
      nativeTokenKey,
    )
    expect(depositInfo.amount).to.equal(BigInt("0"))
    expect(depositInfo.lastDepositBlockNo).to.equal(0)
    expect(depositInfo.lastDepositBlockNoIdx).to.equal(0)
    expect(depositInfo.lastWithdrawBlockNo).to.equal(0)
    expect(depositInfo.lastWithdrawBlockNoIdx).to.equal(0)

    // Check account validation
    let accountValid = await dexManagerContract.dexAccountsValid(suSigner.address)
    expect(accountValid.isInitialized).to.equal(false)
    expect(accountValid.isValid).to.equal(false)

    const tx = await suSigner.sendTransaction({
      to: dexManagerContract.address,
      value: ethers.utils.parseEther("1"),
    })
    const txReceipt = await hre.ethers.provider.getTransactionReceipt(tx.hash)
    const eventInterface = new ethers.utils.Interface([
      "event DexAccountDeposited(address indexed from, address indexed to, string tokenKey, uint256 amount, uint256 total)",
    ])
    const event = eventInterface.decodeEventLog(
      "DexAccountDeposited",
      txReceipt.logs[0].data,
      txReceipt.logs[0].topics,
    )
    expect(event.from).to.equal(suSigner.address)
    expect(event.to).to.equal(suSigner.address)
    expect(event.tokenKey).to.equal(nativeTokenKey)
    expect(event.amount).to.equal(ethers.utils.parseEther("1"))
    expect(event.total).to.equal(ethers.utils.parseEther("1"))

    dexBalance = await dexManagerContract.getDexNativeBalanceOf(suSigner.address)
    expect(dexBalance).to.equal(BigInt(1e18))

    // Check deposit info
    depositInfo = await dexManagerContract.getDexDepositInfo(
      suSigner.address,
      nativeTokenKey,
    )
    expect(depositInfo.amount).to.equal(BigInt(1e18))
    expect(depositInfo.lastDepositBlockNo).to.equal(txReceipt.blockNumber)
    expect(depositInfo.lastDepositBlockNoIdx).to.equal(0)
    expect(depositInfo.lastWithdrawBlockNo).to.equal(0)
    expect(depositInfo.lastWithdrawBlockNoIdx).to.equal(0)

    // Check account validation
    accountValid = await dexManagerContract.dexAccountsValid(suSigner.address)
    expect(accountValid.isInitialized).to.equal(true)
    expect(accountValid.isValid).to.equal(true)

    await expect(
      dexManagerContract.depositDexToken(suSigner.address, nativeTokenKey, 0, {
        value: ethers.utils.parseEther("1"),
      }),
    )
      .to.emit(dexManagerContract, "DexAccountDeposited")
      .withArgs(
        suSigner.address,
        suSigner.address,
        nativeTokenKey,
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("2"),
      )
  })

  it("Should deposit ERC20 token", async function () {
    expect(await dexManagerContract.isValidDexToken(usdtTokenKey)).to.equal(true)

    let dexBalance = await dexManagerContract.getDexBalanceOf(
      suSigner.address,
      usdtTokenKey,
    )
    expect(dexBalance).to.equal(BigInt("0"))

    const depositAmount = ethers.utils.parseUnits("1000", 6)

    // 1. approve first
    await expect(usdtContract.approve(dexManagerContract.address, depositAmount))
      .to.emit(usdtContract, "Approval")
      .withArgs(suSigner.address, dexManagerContract.address, depositAmount)

    // 2. Deposit into DexManager
    await expect(
      dexManagerContract.depositDexToken(suSigner.address, usdtTokenKey, depositAmount),
    )
      .to.emit(dexManagerContract, "DexAccountDeposited")
      .withArgs(
        suSigner.address,
        suSigner.address,
        usdtTokenKey,
        depositAmount,
        depositAmount,
      )

    dexBalance = await dexManagerContract.getDexBalanceOf(
      suSigner.address,
      usdtTokenKey,
    )
    expect(dexBalance).to.equal(depositAmount)

    // 1. approve first
    await expect(usdtContract.approve(dexManagerContract.address, depositAmount))
      .to.emit(usdtContract, "Approval")
      .withArgs(suSigner.address, dexManagerContract.address, depositAmount)

    // 2. Deposit into DexManager
    await expect(
      dexManagerContract.depositDexToken(suSigner.address, usdtTokenKey, depositAmount),
    )
      .to.emit(dexManagerContract, "DexAccountDeposited")
      .withArgs(
        suSigner.address,
        suSigner.address,
        usdtTokenKey,
        depositAmount,
        depositAmount.mul(2),
      )

    dexBalance = await dexManagerContract.getDexBalanceOf(
      suSigner.address,
      usdtTokenKey,
    )
    expect(dexBalance).to.equal(depositAmount.mul(2))
  })

  it("Should enable/disable account", async function () {
    const account = (await hre.ethers.getSigners())[2]
    // Check account validation
    let accountValid = await dexManagerContract.dexAccountsValid(account.address)
    expect(accountValid.isInitialized).to.equal(false)
    expect(accountValid.isValid).to.equal(false)

    await expect(dexManagerContract.enableAccount(account.address))
      .to.emit(dexManagerContract, "DexAccountEnabled")
      .withArgs(account.address, suSigner.address)

    accountValid = await dexManagerContract.dexAccountsValid(account.address)
    expect(accountValid.isInitialized).to.equal(true)
    expect(accountValid.isValid).to.equal(true)

    await expect(dexManagerContract.disableAccount(account.address))
      .to.emit(dexManagerContract, "DexAccountDisabled")
      .withArgs(account.address, suSigner.address)

    accountValid = await dexManagerContract.dexAccountsValid(account.address)
    expect(accountValid.isInitialized).to.equal(true)
    expect(accountValid.isValid).to.equal(false)
  })
})
