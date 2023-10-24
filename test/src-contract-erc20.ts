import { expect } from "chai"
import hre from "hardhat"

import { deployERC20Contract } from "../src/contract/erc20"
import { Wasd3rSampleErc20USDT__factory } from "../src/contract/types"

describe("src > contract > erc20", function () {
  let contractCtrl

  before("deploy the contract", async function () {
    contractCtrl = await deployERC20Contract(
      hre.ethers.provider,
      (
        await hre.ethers.getSigners()
      )[0],
      Wasd3rSampleErc20USDT__factory,
    )
  })

  it("Should have decimals", async function () {
    expect((await contractCtrl.getDecimals()) === 6)
  })

  it("Should be mintable", async function () {
    const signer = (await hre.ethers.getSigners())[1]
    expect((await contractCtrl.balanceOf(signer.address)) === 0)

    await contractCtrl.mintToken(signer.address, 1e6)

    expect((await contractCtrl.balanceOf(signer.address)) === 1e6)
  })
})
