import { expect } from "chai"
import { ethers } from "ethers"
import hre from "hardhat"

import {
  Wasd3rDexManager__factory,
  Wasd3rSampleErc20USDT__factory,
} from "../src/contract/types"

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

  it("Should swap base token and quote token", async function () {
    let aliceNativeBalance = await dexManagerContract.getDexNativeBalanceOf(
      alice.address,
    )
    expect(aliceNativeBalance).to.equal(ethers.utils.parseEther("10"))
    let bobUsdtBalance = await dexManagerContract.getDexBalanceOf(
      bob.address,
      usdtTokenKey,
    )
    expect(bobUsdtBalance).to.equal(ethers.utils.parseUnits("10000", 6))
  })
})
