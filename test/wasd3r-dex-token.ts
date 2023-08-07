import { expect } from "chai"
import hre from "hardhat"

import { ZERO_ADDRESS } from "../src/constants"

describe("Wasd3r AA Dex: Token Management", function () {
  let contract

  before("deploy the contract", async function () {
    const contractFactory = await hre.ethers.getContractFactory("Wasd3rDexManager")
    contract = await contractFactory.deploy()
    await contract.deployed()
  })

  it("Should have native token registered in the token manager", async function () {
    const nativeTokenKey = await contract.DEX_TOKEN_NATIVE_TOKEN_KEY()
    expect(nativeTokenKey === "0:__native__:0:18")

    const nativeTokenInfo = await contract.dexTokens(nativeTokenKey)
    expect(nativeTokenInfo.isValid)
    expect(nativeTokenInfo.decimals === 18)
    expect(nativeTokenInfo.tokenType === 0)
    expect(nativeTokenInfo.tokenName === "__native__")
    expect(Number(nativeTokenInfo.tokenId) === 0)

    const tokenInfo = await contract.getDexTokenInfo(nativeTokenKey)
    expect(
      // @ts-ignore
      tokenInfo ===
        {
          isValid: true,
          decimals: 18,
          tokenType: 0,
          tokenName: "__native__",
          tokenId: BigInt("0"),
        },
    )

    expect(await contract.isValidDexToken(nativeTokenKey))
  })

  it("Should handle non-registered token", async function () {
    const nativeTokenInfo = await contract.dexTokens("non-exist-token-key")
    expect(!nativeTokenInfo.isValid)
    expect(nativeTokenInfo.decimals === 0)
    expect(nativeTokenInfo.tokenType === 0)
    expect(nativeTokenInfo.tokenName === "")
    expect(Number(nativeTokenInfo.tokenId) === 0)

    expect(!(await contract.isValidDexToken("non-exist-token-key")))
  })

  it("Should deregister a token", async function () {
    const nativeTokenKey = await contract.DEX_TOKEN_NATIVE_TOKEN_KEY()
    expect(await contract.isValidDexToken(nativeTokenKey))

    expect(await contract.deregisterDexToken(nativeTokenKey))
    expect(!(await contract.isValidDexToken(nativeTokenKey)))
  })

  it("Should return a token key", async function () {
    const nativeTokenKey = await contract.DEX_TOKEN_NATIVE_TOKEN_KEY()
    const tokenKey1 = await contract.getTokenKey(0, ZERO_ADDRESS, 0, 18)
    expect(nativeTokenKey === tokenKey1)

    const tokenKey2 = await contract.getTokenKey(
      1, // ERC20
      "0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15", // Not registered token contract address
      0,
      6,
    )
    expect(tokenKey2 === "1:0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15:0:6")
  })

  it("Should register a token", async function () {
    const tokenKey = await contract.getTokenKey(
      1, // ERC20
      "0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15", // token contract address
      0,
      6,
    )
    expect(!(await contract.isValidDexToken(tokenKey)))

    await contract.registerDexToken(
      1, // ERC20
      "0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15", // token contract address
      0,
      6,
      "USDT",
    )
    expect(await contract.isValidDexToken(tokenKey))
  })
})
