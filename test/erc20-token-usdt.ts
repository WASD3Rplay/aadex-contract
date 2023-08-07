import { expect } from "chai"
import hre from "hardhat"

describe("Sample Wasd3r ERC20 USDT", function () {
  let contract

  before("deploy the contract", async function () {
    const contractFactory = await hre.ethers.getContractFactory("Wasd3rSampleErc20USDT")
    contract = await contractFactory.deploy()
    await contract.deployed()
  })

  it("Should have decimals", async function () {
    expect((await contract.decimals()) === 6)
  })
  it("Should be mintable", async function () {
    const signer = (await hre.ethers.getSigners())[0]
    expect((await contract.balanceOf(signer.address)) === 0)

    await contract.mint(signer.address, 1e6)

    expect((await contract.balanceOf(signer.address)) === 1e6)
  })
})
