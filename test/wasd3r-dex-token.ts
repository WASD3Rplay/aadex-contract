import { expect } from "chai"
import hre from "hardhat"

import { ZERO_ADDRESS } from "../src/constants"

describe("Wasd3r AA Dex: Token Management", function () {
  let suSigner
  let contract

  before("deploy the contract", async function () {
    suSigner = (await hre.ethers.getSigners())[0]
    const contractFactory = await hre.ethers.getContractFactory("Wasd3rDexManager", {
      signer: suSigner,
    })
    contract = await contractFactory.deploy()
    await contract.deployed()
  })

  it("Should have native token registered in the token manager", async function () {
    const nativeTokenKey = await contract.DEX_TOKEN_NATIVE_TOKEN_KEY()
    expect(nativeTokenKey).to.equal("0:__native__:0:18")

    const nativeTokenInfo = await contract.dexTokens(nativeTokenKey)
    expect(nativeTokenInfo.isValid).to.equal(true)
    expect(nativeTokenInfo.decimals).to.equal(18)
    expect(nativeTokenInfo.tokenType).to.equal(0)
    expect(nativeTokenInfo.tokenName).to.equal("__native__")
    expect(nativeTokenInfo.tokenId).to.equal(BigInt("0"))

    const tokenInfo = await contract.getDexTokenInfo(nativeTokenKey)
    expect(tokenInfo.isValid).to.equal(true)
    expect(tokenInfo.decimals).to.equal(18)
    expect(tokenInfo.tokenType).to.equal(0)
    expect(tokenInfo.tokenName).to.equal("__native__")
    expect(tokenInfo.tokenId).to.equal(BigInt("0"))

    expect(await contract.isValidDexToken(nativeTokenKey)).to.equal(true)
  })

  it("Should handle non-registered token", async function () {
    const nativeTokenInfo = await contract.dexTokens("non-exist-token-key")
    expect(nativeTokenInfo.isValid).to.equal(false)
    expect(nativeTokenInfo.decimals).to.equal(0)
    expect(nativeTokenInfo.tokenType).to.equal(0)
    expect(nativeTokenInfo.tokenName).to.equal("")
    expect(Number(nativeTokenInfo.tokenId)).to.equal(0)

    expect(!(await contract.isValidDexToken("non-exist-token-key")))
  })

  it("Should return a token key", async function () {
    const nativeTokenKey = await contract.DEX_TOKEN_NATIVE_TOKEN_KEY()
    const tokenKey1 = await contract.getTokenKey(0, ZERO_ADDRESS, 0, 18)
    expect(nativeTokenKey).to.equal(tokenKey1)

    const tokenKey2 = await contract.getTokenKey(
      1, // ERC20
      "0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15", // Not registered token contract address
      0,
      6,
    )
    // Contract address would be lowercase string in the token key.
    expect(tokenKey2).to.equal("1:0x75ce7aee59347612ed29ff5c249e34ed1bc17d15:0:6")
  })

  it("Should register a token", async function () {
    const tokenKey = await contract.getTokenKey(
      1, // ERC20
      "0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15", // token contract address
      0,
      6,
    )
    expect(await contract.isValidDexToken(tokenKey)).to.equal(false)

    await expect(
      contract.registerDexToken(
        1, // ERC20
        "0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15", // token contract address
        0,
        6,
        "USDT",
      ),
    )
      .to.emit(contract, "DexTokenRegistered")
      .withArgs(
        suSigner.address,
        tokenKey,
        "0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15",
        "USDT",
        1,
        6,
        0,
      )
    expect(await contract.isValidDexToken(tokenKey)).to.equal(true)
  })

  it("Should deregister a token", async function () {
    const nativeTokenKey = await contract.DEX_TOKEN_NATIVE_TOKEN_KEY()
    expect(await contract.isValidDexToken(nativeTokenKey)).to.equal(true)

    await expect(contract.deregisterDexToken(nativeTokenKey))
      .to.emit(contract, "DexTokenDeregistered")
      .withArgs(suSigner.address, nativeTokenKey)
    expect(await contract.isValidDexToken(nativeTokenKey)).to.equal(false)
  })
})
