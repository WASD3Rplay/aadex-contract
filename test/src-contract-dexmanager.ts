import { expect } from "chai"
import { ethers } from "ethers"
import hre from "hardhat"

import { ZERO_ADDRESS } from "../src"
import { deployDexManager } from "../src/contract/dexmanager"
import { deployEntryPoint } from "../src/contract/entrypoint"
import { deployERC20Contract } from "../src/contract/erc20"
import { Wasd3rSampleErc20USDT__factory } from "../src/contract/types"

describe("src > contract > dexmanager", function () {
  let suSigner
  let entrypointCtrl
  let dexmanagerCtrl
  let usdtCtrl
  let usdtDecimals
  let usdtTokenKey
  let nativeTokenKey

  before("deploy the contracts", async function () {
    suSigner = (await hre.ethers.getSigners())[0]

    entrypointCtrl = await deployEntryPoint(hre.ethers.provider, suSigner)
    dexmanagerCtrl = await deployDexManager(
      hre.ethers.provider,
      suSigner,
      entrypointCtrl.contractAddress,
    )
    usdtCtrl = await deployERC20Contract(
      hre.ethers.provider,
      suSigner,
      Wasd3rSampleErc20USDT__factory,
    )
    usdtDecimals = await usdtCtrl.getDecimals()

    usdtTokenKey = await dexmanagerCtrl.getTokenKey(
      1, // token type: ERC20
      usdtCtrl.contractAddress,
      usdtDecimals,
      0, // token ID for ERC1155
    )

    nativeTokenKey = await dexmanagerCtrl.getNativeTokenKey()
    expect(nativeTokenKey).to.equal("0:__native__:0:18")
  })

  it("Should have native token registered in the token manager", async function () {
    const nativeTokenInfo = await dexmanagerCtrl.getDexTokenInfo(nativeTokenKey)
    expect(nativeTokenInfo.isValid).to.equal(true)
    expect(nativeTokenInfo.decimals).to.equal(18)
    expect(nativeTokenInfo.tokenType).to.equal(0)
    expect(nativeTokenInfo.tokenName).to.equal("__native__")
    expect(nativeTokenInfo.tokenId).to.equal(BigInt("0"))

    const tokenInfo = await dexmanagerCtrl.getDexTokenInfo(nativeTokenKey)
    expect(tokenInfo.isValid).to.equal(true)
    expect(tokenInfo.decimals).to.equal(18)
    expect(tokenInfo.tokenType).to.equal(0)
    expect(tokenInfo.tokenName).to.equal("__native__")
    expect(tokenInfo.tokenId).to.equal(BigInt("0"))

    expect(await dexmanagerCtrl.isValidDexToken(nativeTokenKey)).to.equal(true)
  })

  it("Should handle non-registered token", async function () {
    const tokenInfo = await dexmanagerCtrl.getDexTokenInfo("non-exist-token-key")
    expect(tokenInfo.isValid).to.equal(false)
    expect(tokenInfo.decimals).to.equal(0)
    expect(tokenInfo.tokenType).to.equal(0)
    expect(tokenInfo.tokenName).to.equal("")
    expect(Number(tokenInfo.tokenId)).to.equal(0)

    expect(!(await dexmanagerCtrl.isValidDexToken("non-exist-token-key")))
  })

  it("Should return a token key", async function () {
    const tokenKey1 = await dexmanagerCtrl.getTokenKey(0, ZERO_ADDRESS, 0, 18)
    expect(nativeTokenKey).to.equal(tokenKey1)

    const tokenKey2 = await dexmanagerCtrl.getTokenKey(
      1, // ERC20
      usdtCtrl.contractAddress, // Not registered token contract address
      usdtDecimals,
      0,
    )
    // Contract address would be lowercase string in the token key.
    expect(tokenKey2).to.equal(
      `1:${usdtCtrl.contractAddress.toLowerCase()}:0:${usdtDecimals}`,
    )
  })

  it("Should register a token", async function () {
    const tokenKey = await dexmanagerCtrl.getTokenKey(
      1, // ERC20
      usdtCtrl.contractAddress, // token contract address
      usdtDecimals,
      0,
    )
    expect(await dexmanagerCtrl.isValidDexToken(tokenKey)).to.equal(false)

    const txreceipt = await dexmanagerCtrl.registerDexToken(
      1, // ERC20
      usdtCtrl.contractAddress, // token contract address
      "USDT",
      usdtDecimals,
      0,
    )
    expect(txreceipt.events.length).to.equal(1)
    expect(txreceipt.events[0].event).to.equal("DexTokenRegistered")
    expect(txreceipt.events[0].args[0]).to.equal(suSigner.address)
    expect(txreceipt.events[0].args[1]).to.equal(tokenKey)
    expect(txreceipt.events[0].args[2]).to.equal(usdtCtrl.contractAddress)
    expect(txreceipt.events[0].args[3]).to.equal("USDT")
    expect(txreceipt.events[0].args[4]).to.equal(1)
    expect(txreceipt.events[0].args[5]).to.equal(usdtDecimals)
    expect(txreceipt.events[0].args[6]).to.equal(0)

    expect(await dexmanagerCtrl.isValidDexToken(tokenKey)).to.equal(true)
  })

  it("Should fail to register unsupproted token type", async function () {
    const tokenKey = `3:${usdtCtrl.contractAddress}:0:18`
    expect(await dexmanagerCtrl.isValidDexToken(tokenKey)).to.equal(false)

    // Register unsupported token
    try {
      await dexmanagerCtrl.registerDexToken(
        3, // non-exist token type
        usdtCtrl.contractAddress, // Not registered token contract address
        "unsupproted_tokenm", // token name
        18,
        0,
      )
      expect(false).to.true // shouldn't be here
    } catch (err) {
      expect(err.reason).to.equal(
        "VM Exception while processing transaction: reverted with reason string 'Unsupported token type'",
      )
    }
    expect(await dexmanagerCtrl.isValidDexToken(tokenKey)).to.equal(false)
  })

  it("Should deposit native token", async function () {
    let dexBalance = await dexmanagerCtrl.getDexNativeBalanceOf(suSigner.address)
    expect(dexBalance).to.equal(BigInt("0"))

    // Check deposit info
    let depositInfo = await dexmanagerCtrl.getDexDepositInfo(
      suSigner.address,
      nativeTokenKey,
    )
    expect(depositInfo.amount).to.equal(BigInt("0"))
    expect(depositInfo.lastDepositBlockNo).to.equal(0)
    expect(depositInfo.lastDepositBlockNoIdx).to.equal(0)
    expect(depositInfo.lastWithdrawBlockNo).to.equal(0)
    expect(depositInfo.lastWithdrawBlockNoIdx).to.equal(0)

    // Check account validation
    let accountValid = await dexmanagerCtrl.getDexAccountValid(suSigner.address)
    expect(accountValid.isInitialized).to.equal(false)
    expect(accountValid.isValid).to.equal(false)

    const tx = await suSigner.sendTransaction({
      to: dexmanagerCtrl.contractAddress,
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

    dexBalance = await dexmanagerCtrl.getDexNativeBalanceOf(suSigner.address)
    expect(dexBalance).to.equal(BigInt(1e18))

    // Check deposit info
    depositInfo = await dexmanagerCtrl.getDexDepositInfo(
      suSigner.address,
      nativeTokenKey,
    )
    expect(depositInfo.amount).to.equal(BigInt(1e18))
    expect(depositInfo.lastDepositBlockNo).to.equal(txReceipt.blockNumber)
    expect(depositInfo.lastDepositBlockNoIdx).to.equal(0)
    expect(depositInfo.lastWithdrawBlockNo).to.equal(0)
    expect(depositInfo.lastWithdrawBlockNoIdx).to.equal(0)

    // Check account validation
    accountValid = await dexmanagerCtrl.getDexAccountValid(suSigner.address)
    expect(accountValid.isInitialized).to.equal(true)
    expect(accountValid.isValid).to.equal(true)

    const txreceipt = await dexmanagerCtrl.depositDexToken(
      suSigner.address,
      nativeTokenKey,
      0,
      ethers.utils.parseEther("1"),
    )
    expect(txreceipt.events.length).to.equal(1)
    expect(txreceipt.events[0].event).to.equal("DexAccountDeposited")
    expect(txreceipt.events[0].args[0]).to.equal(suSigner.address)
    expect(txreceipt.events[0].args[1]).to.equal(suSigner.address)
    expect(txreceipt.events[0].args[2]).to.equal(nativeTokenKey)
    expect(txreceipt.events[0].args[3]).to.equal(ethers.utils.parseEther("1"))
    expect(txreceipt.events[0].args[4]).to.equal(ethers.utils.parseEther("2"))
  })

  it("Should deposit ERC20 token", async function () {
    expect(await dexmanagerCtrl.isValidDexToken(usdtTokenKey)).to.equal(true)

    let dexBalance = await dexmanagerCtrl.getDexBalanceOf(
      suSigner.address,
      usdtTokenKey,
    )
    expect(dexBalance).to.equal(BigInt("0"))

    const depositAmount = ethers.utils.parseUnits("1000", 6)

    // 1. approve first
    const txreceipt1 = await usdtCtrl.approve(
      dexmanagerCtrl.contractAddress,
      depositAmount,
    )
    expect(txreceipt1.events.length).to.equal(1)
    expect(txreceipt1.events[0].event).to.equal("Approval")
    expect(txreceipt1.events[0].args[0]).to.equal(suSigner.address)
    expect(txreceipt1.events[0].args[1]).to.equal(dexmanagerCtrl.contractAddress)
    expect(txreceipt1.events[0].args[2]).to.equal(depositAmount)

    // 2. Deposit into DexManager
    const txreceipt2 = await dexmanagerCtrl.depositDexToken(
      suSigner.address,
      usdtTokenKey,
      depositAmount,
    )
    expect(txreceipt2.events.length >= 1).to.true
    let event
    for (let i = 0; i < txreceipt2.events.length; i++) {
      if (txreceipt2.events[i].event === "DexAccountDeposited") {
        event = txreceipt2.events[i]
        break
      }
    }
    expect(event.event).to.equal("DexAccountDeposited")
    expect(event.args[0]).to.equal(suSigner.address)
    expect(event.args[1]).to.equal(suSigner.address)
    expect(event.args[2]).to.equal(usdtTokenKey)
    expect(event.args[3]).to.equal(depositAmount)
    expect(event.args[4]).to.equal(depositAmount)

    dexBalance = await dexmanagerCtrl.getDexBalanceOf(suSigner.address, usdtTokenKey)
    expect(dexBalance).to.equal(depositAmount)

    // 1. approve first
    const txreceipt3 = await usdtCtrl.approve(
      dexmanagerCtrl.contractAddress,
      depositAmount,
    )
    expect(txreceipt3.events.length).to.equal(1)
    expect(txreceipt3.events[0].event).to.equal("Approval")
    expect(txreceipt3.events[0].args[0]).to.equal(suSigner.address)
    expect(txreceipt3.events[0].args[1]).to.equal(dexmanagerCtrl.contractAddress)
    expect(txreceipt3.events[0].args[2]).to.equal(depositAmount)

    // 2. Deposit into DexManager
    const txreceipt4 = await dexmanagerCtrl.depositDexToken(
      suSigner.address,
      usdtTokenKey,
      depositAmount,
    )
    expect(txreceipt4.events.length >= 1).to.true
    for (let i = 0; i < txreceipt4.events.length; i++) {
      if (txreceipt4.events[i].event === "DexAccountDeposited") {
        event = txreceipt4.events[i]
        break
      }
    }
    expect(event.event).to.equal("DexAccountDeposited")
    expect(event.args[0]).to.equal(suSigner.address)
    expect(event.args[1]).to.equal(suSigner.address)
    expect(event.args[2]).to.equal(usdtTokenKey)
    expect(event.args[3]).to.equal(depositAmount)
    expect(event.args[4]).to.equal(depositAmount.mul(2))

    dexBalance = await dexmanagerCtrl.getDexBalanceOf(suSigner.address, usdtTokenKey)
    expect(dexBalance).to.equal(depositAmount.mul(2))
  })

  /*
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
  */
})
