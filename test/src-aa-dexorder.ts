import { expect } from "chai"
import { ethers } from "ethers"
import hre from "hardhat"

import { DexOrderType, createNSignDexOrder, getDexOrderData } from "../src/aa/dexorder"
import { ZERO_ADDRESS } from "../src/constants"
import { EthProvider } from "../src/eth/provider"

describe("src > aa > dexorder", function () {
  it("Should create a new dex order and sign it", async function () {
    const signer = (await hre.ethers.getSigners())[0]
    const ethProvider = new EthProvider(hre.ethers.provider)

    const chainId = await ethProvider.getChainId()
    const dexManagerContractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    const usdtContractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
    const price = ethers.utils.parseUnits("1000", 6) // price: 1000 USDT for 1 ETH
    const requestAmount = ethers.utils.parseEther("3") // request 3 ETH

    const dexorder = await createNSignDexOrder(
      chainId,
      dexManagerContractAddress,
      signer,
      1, // orderId
      DexOrderType.BUY,
      ZERO_ADDRESS, // base ticker contract address: native token is zero address
      usdtContractAddress, // quote ticker contract address: USDT
      price,
      requestAmount,
    )

    expect(dexorder.orderId).to.equal(1)
    expect(dexorder.orderType).to.equal(DexOrderType.BUY)
    expect(dexorder.baseTokenAddr).to.equal(ZERO_ADDRESS)
    expect(dexorder.quoteTokenAddr).to.equal(usdtContractAddress)
    expect(dexorder.price).to.equal(price)
    expect(dexorder.requestAmount).to.equal(requestAmount)
    expect(dexorder.signature).to.not.null

    const dexorderData = getDexOrderData(
      chainId,
      dexManagerContractAddress,
      DexOrderType.BUY,
      ZERO_ADDRESS,
      usdtContractAddress,
      price,
      requestAmount,
    )
    const signerAddress = ethers.utils.verifyMessage(dexorderData, dexorder.signature)
    expect(signerAddress).to.equal(signer.address)
  })
})
