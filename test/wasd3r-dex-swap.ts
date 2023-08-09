import { expect } from "chai"
import { ethers } from "ethers"
import hre from "hardhat"

import { DexOrderType, createNSignDexOrder, getDexOrderData } from "../src/aa/dexorder"
import { ZERO_ADDRESS } from "../src/constants"
import {
  Wasd3rDexManager__factory,
  Wasd3rSampleErc20USDT__factory,
} from "../src/contract/types"
import { EthProvider } from "../src/eth/provider"

describe("Wasd3r AA Dex: Dex Manager", function () {
  let suSigner
  let alice, bob
  let dexManagerContract
  let usdtContract
  let nativeTokenKey
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

    nativeTokenKey = await dexManagerContract.DEX_TOKEN_NATIVE_TOKEN_KEY()

    const usdtContractFactory = await hre.ethers.getContractFactory(
      "Wasd3rSampleErc20USDT",
      {
        signer: suSigner,
      },
    )
    usdtContract = await usdtContractFactory.deploy()
    await usdtContract.deployed()

    // register USDT in DexManager
    await dexManagerContract.registerDexToken(1, usdtContract.address, 0, 6, "USDT")
    usdtTokenKey = await dexManagerContract.getTokenKey(
      1, // ERC20
      usdtContract.address,
      0,
      6,
    )

    alice = (await hre.ethers.getSigners())[1]
    // deposit Alice's native token
    const nativeAmount = ethers.utils.parseEther("10")
    await expect(
      alice.sendTransaction({
        to: dexManagerContract.address,
        value: nativeAmount,
      }),
    )
      .to.emit(dexManagerContract, "DexAccountDeposited")
      .withArgs(
        alice.address,
        alice.address,
        nativeTokenKey,
        nativeAmount,
        nativeAmount,
      )

    bob = (await hre.ethers.getSigners())[2]
    // transfer USDT to Bob
    const usdtAmount = ethers.utils.parseUnits("10000", 6)
    await expect(usdtContract.transfer(bob.address, usdtAmount))
      .to.emit(usdtContract, "Transfer")
      .withArgs(suSigner.address, bob.address, usdtAmount)
    // approve Bob's USDT to deposit
    const bobUsdtContract = Wasd3rSampleErc20USDT__factory.connect(
      usdtContract.address,
      bob,
    )
    await expect(bobUsdtContract.approve(dexManagerContract.address, usdtAmount))
      .to.emit(usdtContract, "Approval")
      .withArgs(bob.address, dexManagerContract.address, usdtAmount)
    // deposit USDT to Bob's account
    const bobDexManagerContract = Wasd3rDexManager__factory.connect(
      dexManagerContract.address,
      bob,
    )
    await expect(
      bobDexManagerContract.depositDexToken(bob.address, usdtTokenKey, usdtAmount),
    )
      .to.emit(dexManagerContract, "DexAccountDeposited")
      .withArgs(bob.address, bob.address, usdtTokenKey, usdtAmount, usdtAmount)
  })

  it("Should swap between buyer and seller", async function () {
    // Superuser has 0 ETH and 0 USDT
    let suNativeBalance = await dexManagerContract.getDexNativeBalanceOf(
      suSigner.address,
    )
    expect(suNativeBalance).to.equal(ethers.utils.parseEther("0"))
    let suUsdtBalance = await dexManagerContract.getDexBalanceOf(
      suSigner.address,
      usdtTokenKey,
    )
    expect(suUsdtBalance).to.equal(ethers.utils.parseUnits("0", 6))
    // Alice has 10 ETH and 0 USDT
    let aliceNativeBalance = await dexManagerContract.getDexNativeBalanceOf(
      alice.address,
    )
    expect(aliceNativeBalance).to.equal(ethers.utils.parseEther("10"))
    let aliceUsdtBalance = await dexManagerContract.getDexBalanceOf(
      alice.address,
      usdtTokenKey,
    )
    expect(aliceUsdtBalance).to.equal(ethers.utils.parseUnits("0", 6))
    // Bob has 0 ETH and 10000 USDT
    let bobNativeBalance = await dexManagerContract.getDexNativeBalanceOf(bob.address)
    expect(bobNativeBalance).to.equal(ethers.utils.parseEther("0"))
    let bobUsdtBalance = await dexManagerContract.getDexBalanceOf(
      bob.address,
      usdtTokenKey,
    )
    expect(bobUsdtBalance).to.equal(ethers.utils.parseUnits("10000", 6))

    const ethProvider = new EthProvider(hre.ethers.provider)
    const chainId = await ethProvider.getChainId()
    const price = ethers.utils.parseUnits("1500", 6) // 1500 USDT for 1 ETH

    // create buy dex order: Bob wants to buy 3 ETH.
    const buyDexOrder = await createNSignDexOrder(
      chainId,
      dexManagerContract.address,
      bob,
      1,
      DexOrderType.BUY,
      ZERO_ADDRESS,
      usdtContract.address,
      price,
      ethers.utils.parseEther("8"),
    )

    // create sell dex order: Alice wants to sell 1 ETH.
    const sellDexOrder = await createNSignDexOrder(
      chainId,
      dexManagerContract.address,
      alice,
      2,
      DexOrderType.SELL,
      ZERO_ADDRESS,
      usdtContract.address,
      price,
      ethers.utils.parseEther("10"),
    )

    // swap ERROR: swap base ticker amount is bigger than buyer's request base ticker amount in the buy dex order
    try {
      await dexManagerContract.swap(
        1000,
        100,
        buyDexOrder,
        bob.address,
        ethers.utils.parseEther("0"),
        sellDexOrder,
        alice.address,
        ethers.utils.parseUnits("0", 6),
        nativeTokenKey,
        ethers.utils.parseEther("10.1"),
        usdtTokenKey,
        ethers.utils.parseUnits("1000", 6),
        suSigner.address,
      )
      expect(false, "SHOULD not be here").to.true
    } catch (error) {
      expect(
        error.message.includes("Request amount is not acceptable in seller dex order"),
      ).to.true
    }

    // swap ERROR: swap quote ticker amount is bigger thant seller's request quote ticker amount in the sell dex order
    try {
      await dexManagerContract.swap(
        1000,
        100,
        buyDexOrder,
        bob.address,
        ethers.utils.parseEther("0"),
        sellDexOrder,
        alice.address,
        ethers.utils.parseUnits("0", 6),
        nativeTokenKey,
        ethers.utils.parseEther("10"),
        usdtTokenKey,
        ethers.utils.parseUnits("12000.1", 6),
        suSigner.address,
      )
      expect(false, "SHOULD not be here").to.true
    } catch (error) {
      expect(
        error.message.includes("Request amount is not acceptable in buyer dex order"),
      ).to.true
    }

    // swap: Alice sells 1 ETH for 1500 USDT to Bob, fee is 1% each.
    const swapBaseAmount = ethers.utils.parseEther("1")
    const swapQuoteAmount = ethers.utils.parseUnits("1500", 6)
    const swapBaseFeeAmount = swapBaseAmount.div(100)
    const swapQuoteFeeAmount = swapQuoteAmount.div(100)
    await expect(
      dexManagerContract.swap(
        1000,
        100,
        buyDexOrder,
        bob.address,
        swapBaseFeeAmount, // buyer's fee as the base ticker
        sellDexOrder,
        alice.address,
        swapQuoteFeeAmount, // seller's fee as the quote ticker
        nativeTokenKey,
        swapBaseAmount,
        usdtTokenKey,
        swapQuoteAmount,
        suSigner.address,
      ),
    )
      .to.emit(dexManagerContract, "DexSwapped")
      .withArgs(
        1000,
        100,
        bob.address,
        alice.address,
        swapBaseFeeAmount,
        swapQuoteFeeAmount,
        nativeTokenKey,
        swapBaseAmount,
        usdtTokenKey,
        swapQuoteAmount,
        suSigner.address,
      )

    // Superuser should have 0.01 ETH and 15 USDT
    suNativeBalance = await dexManagerContract.getDexNativeBalanceOf(suSigner.address)
    expect(suNativeBalance).to.equal(swapBaseFeeAmount)
    suUsdtBalance = await dexManagerContract.getDexBalanceOf(
      suSigner.address,
      usdtTokenKey,
    )
    expect(suUsdtBalance).to.equal(swapQuoteFeeAmount)

    // Alice has 9 ETH and (1500 - 15) USDT
    const aliceNewNativeBalance = await dexManagerContract.getDexNativeBalanceOf(
      alice.address,
    )
    expect(aliceNewNativeBalance).to.equal(aliceNativeBalance.sub(swapBaseAmount))
    const aliceNewUsdtBalance = await dexManagerContract.getDexBalanceOf(
      alice.address,
      usdtTokenKey,
    )
    expect(aliceNewUsdtBalance).to.equal(
      aliceUsdtBalance.add(swapQuoteAmount).sub(swapQuoteFeeAmount),
    )

    // Bob has 0 ETH and 10000 USDT
    const bobNewNativeBalance = await dexManagerContract.getDexNativeBalanceOf(
      bob.address,
    )
    expect(bobNewNativeBalance).to.equal(
      bobNativeBalance.add(swapBaseAmount).sub(swapBaseFeeAmount),
    )
    const bobNewUsdtBalance = await dexManagerContract.getDexBalanceOf(
      bob.address,
      usdtTokenKey,
    )
    expect(bobNewUsdtBalance).to.equal(bobUsdtBalance.sub(swapQuoteAmount))

    // swap ERROR: seller doesn't have enough ETH to subtract
    try {
      await dexManagerContract.swap(
        1000,
        100,
        buyDexOrder,
        bob.address,
        ethers.utils.parseEther("0"),
        sellDexOrder,
        alice.address,
        ethers.utils.parseUnits("0", 6),
        nativeTokenKey,
        ethers.utils.parseEther("10"),
        usdtTokenKey,
        ethers.utils.parseUnits("1000", 6),
        suSigner.address,
      )
      expect(false, "SHOULD not be here").to.true
    } catch (error) {
      expect(
        error.message.includes(
          "Deposit amount is less than the input amount to subtract",
        ),
      ).to.true
    }

    // swap ERROR: buyer doesn't have enough USDT to subtract
    try {
      await dexManagerContract.swap(
        1000,
        100,
        buyDexOrder,
        bob.address,
        ethers.utils.parseEther("0"),
        sellDexOrder,
        alice.address,
        ethers.utils.parseUnits("0", 6),
        nativeTokenKey,
        ethers.utils.parseEther("1"),
        usdtTokenKey,
        ethers.utils.parseUnits("12000", 6),
        suSigner.address,
      )
      expect(false, "SHOULD not be here").to.true
    } catch (error) {
      expect(
        error.message.includes(
          "Deposit amount is less than the input amount to subtract",
        ),
      ).to.true
    }
  })
})
