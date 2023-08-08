import { expect } from "chai"
import { ethers } from "ethers"
import hre from "hardhat"

import { EthProvider } from "../src/eth"

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

  it("Should be able to deposit native token", async function () {
    const nativeTokenKey = await dexManagerContract.DEX_TOKEN_NATIVE_TOKEN_KEY()
    const ethProvider = new EthProvider(hre.ethers.provider)

    let dexBalance = await dexManagerContract.getDexNativeBalanceOf(suSigner.address)
    expect(dexBalance).to.equal(BigInt("0"))

    // Check deposit info
    let depositInfo = await dexManagerContract.getDexDepositInfo(
      suSigner.address,
      nativeTokenKey,
    )
    expect(depositInfo.isValid).to.equal(false)
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
    expect(depositInfo.isValid).to.equal(true)
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

  it("Should be able to deposit ERC20 token", async function () {
    expect(await dexManagerContract.isValidDexToken(usdtTokenKey)).to.equal(true)

    // 1. approve first
    await expect(
      usdtContract.approve(
        dexManagerContract.address,
        ethers.utils.parseUnits("1000", 6),
      ),
    )
      .to.emit(usdtContract, "Approval")
      .withArgs(
        suSigner.address,
        dexManagerContract.address,
        ethers.utils.parseUnits("1000", 6),
      )

    // 2. Deposit into DexManager
    await expect(
      dexManagerContract.depositDexToken(
        suSigner.address,
        usdtTokenKey,
        ethers.utils.parseUnits("1000", 6),
      ),
    )
      .to.emit(dexManagerContract, "DexAccountDeposited")
      .withArgs(
        suSigner.address,
        suSigner.address,
        usdtTokenKey,
        ethers.utils.parseUnits("1000", 6),
        ethers.utils.parseUnits("1000", 6),
      )

    // 1. approve first
    await expect(
      usdtContract.approve(
        dexManagerContract.address,
        ethers.utils.parseUnits("1000", 6),
      ),
    )
      .to.emit(usdtContract, "Approval")
      .withArgs(
        suSigner.address,
        dexManagerContract.address,
        ethers.utils.parseUnits("1000", 6),
      )

    // 2. Deposit into DexManager
    await expect(
      dexManagerContract.depositDexToken(
        suSigner.address,
        usdtTokenKey,
        ethers.utils.parseUnits("1000", 6),
      ),
    )
      .to.emit(dexManagerContract, "DexAccountDeposited")
      .withArgs(
        suSigner.address,
        suSigner.address,
        usdtTokenKey,
        ethers.utils.parseUnits("1000", 6),
        ethers.utils.parseUnits("2000", 6),
      )
  })

  it("Should enable/disable account", async function () {
    // Check account validation
    let accountValid = await dexManagerContract.dexAccountsValid(suSigner.address)
    expect(accountValid.isInitialized).to.equal(false)
    expect(accountValid.isValid).to.equal(false)

    // TODO: add event
    await expect(dexManagerContract.enableAccount(suSigner.address))
  })
})
