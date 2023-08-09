import { expect } from "chai"
import hre from "hardhat"

import { Wasd3rDexManager__factory } from "../src/contract/types"

describe("Wasd3r AA Dex: Access Control", function () {
  let suSigner
  let contractFactory
  let contract

  before("deploy the contract", async function () {
    suSigner = (await hre.ethers.getSigners())[0]
    contractFactory = await hre.ethers.getContractFactory("Wasd3rDexManager", {
      signer: suSigner,
    })
    contract = await contractFactory.deploy()
    await contract.deployed()
  })

  it("Should be the superuser who deployed the contract", async function () {
    expect(await contract.dexSuperuser()).to.equal(suSigner.address)
  })

  it("Should be able to add a new admin by superuser only", async function () {
    const adminSigner = (await hre.ethers.getSigners())[1]
    expect(await contract.dexAdmins(adminSigner.address)).to.equal(false)

    await expect(contract.addAdmin(adminSigner.address))
      .to.emit(contract, "DexAcAdminAdded")
      .withArgs(adminSigner.address, suSigner.address)

    expect(await contract.dexAdmins(adminSigner.address)).to.equal(true)

    try {
      const contract2 = Wasd3rDexManager__factory.connect(contract.address, adminSigner)
      await contract2.addAdmin(adminSigner.address)
      expect(false, "Should not be here").to.equal(true)
    } catch (error) {
      expect(
        error.reason.includes("Only the superuser can call this function"),
      ).to.equal(true)
    }
  })

  it("Should delete an admin by superuser", async function () {
    const adminSigner = (await hre.ethers.getSigners())[1]
    await expect(contract.addAdmin(adminSigner.address))
      .to.emit(contract, "DexAcAdminAdded")
      .withArgs(adminSigner.address, suSigner.address)
    expect(await contract.dexAdmins(adminSigner.address)).to.equal(true)

    // `superuser` can delete an admin.
    await expect(contract.deleteAdmin(adminSigner.address))
      .to.emit(contract, "DexAcAdminDeleted")
      .withArgs(adminSigner.address, suSigner.address)

    expect(await contract.dexAdmins(adminSigner.address)).to.equal(false)
  })

  it("Should delete an admin by admin", async function () {
    const adminSigner1 = (await hre.ethers.getSigners())[1]
    const adminSigner2 = (await hre.ethers.getSigners())[2]

    await expect(contract.addAdmin(adminSigner1.address))
      .to.emit(contract, "DexAcAdminAdded")
      .withArgs(adminSigner1.address, suSigner.address)
    expect(await contract.dexAdmins(adminSigner1.address)).to.equal(true)

    await expect(contract.addAdmin(adminSigner2.address))
      .to.emit(contract, "DexAcAdminAdded")
      .withArgs(adminSigner2.address, suSigner.address)
    expect(await contract.dexAdmins(adminSigner2.address)).to.equal(true)

    // An admin can delete an admin.
    const contract2 = Wasd3rDexManager__factory.connect(contract.address, adminSigner1)
    await expect(contract2.deleteAdmin(adminSigner2.address))
      .to.emit(contract2, "DexAcAdminDeleted")
      .withArgs(adminSigner2.address, adminSigner1.address)

    expect(await contract.dexAdmins(adminSigner1.address)).to.equal(true)
    expect(await contract.dexAdmins(adminSigner2.address)).to.equal(false)
  })

  it("Should NOT delete an admin by anonymous user", async function () {
    const adminSigner = (await hre.ethers.getSigners())[1]
    await expect(contract.addAdmin(adminSigner.address))
      .to.emit(contract, "DexAcAdminAdded")
      .withArgs(adminSigner.address, suSigner.address)
    expect(await contract.dexAdmins(adminSigner.address)).to.equal(true)

    // Anonymous user cannot delete an admin.
    const notAdminSigner = (await hre.ethers.getSigners())[5]
    try {
      const contract2 = Wasd3rDexManager__factory.connect(
        contract.address,
        notAdminSigner,
      )
      await contract2.deleteAdmin(adminSigner.address)
      expect(false, "Should not be here").to.equal(true)
    } catch (error) {
      expect(
        error.reason.includes("Only the superuser or admin can call this function"),
      ).to.equal(true)
    }
  })

  it("Should replace the superuser", async function () {
    expect(await contract.dexSuperuser()).to.equal(suSigner.address)

    const adminSigner = (await hre.ethers.getSigners())[1]
    await expect(contract.addAdmin(adminSigner.address))
      .to.emit(contract, "DexAcAdminAdded")
      .withArgs(adminSigner.address, suSigner.address)
    expect(await contract.dexAdmins(adminSigner.address)).to.equal(true)

    try {
      await contract.replaceSuRequesters(0)
      expect(false, "Should NOT be here").to.equal(true)
    } catch (error) {
      expect(true, "Should be error").to.equal(true)
    }

    await expect(
      contract.requestToReplaceSu("0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15"),
    )
      .to.emit(contract, "DexAcReplaceSuRequested")
      .withArgs(suSigner.address, 1)

    // Superuser is not yet replaced.
    expect(await contract.dexSuperuser()).to.equal(suSigner.address)
    const requester0 = await contract.replaceSuRequesters(0)
    expect(requester0).to.equal(suSigner.address)

    // Superuser should be replaced.
    const suAddress = await contract.dexSuperuser()
    expect(suAddress).to.equal(suSigner.address)
    expect(suAddress).to.not.equal("0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15")

    const contract2 = Wasd3rDexManager__factory.connect(contract.address, adminSigner)
    await expect(
      contract2.requestToReplaceSu("0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15"),
    )
      .to.emit(contract2, "DexAcSuReplaced")
      .withArgs(suSigner.address, "0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15")

    // Superuser should be replaced.
    const newSuAddress = await contract2.dexSuperuser()
    expect(newSuAddress).to.equal("0x75ce7AEE59347612ed29ff5c249e34ED1bc17D15")
  })
})
