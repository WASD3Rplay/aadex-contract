import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@typechain/hardhat"
import { HardhatUserConfig } from "hardhat/config"

const optimizedComilerSettings = {
  version: "0.8.23",
  settings: {
    optimizer: {
      enabled: true,
      runs: 1000000,
    },
    viaIR: true,
  },
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.23",
      },
    ],
    overrides: {
      "contracts/aadex/AADexManager.sol": optimizedComilerSettings,
      "contracts/accounts/AADexSwapCaller.sol": optimizedComilerSettings,
      "contracts/entrypoint/AADexEntryPoint.sol": optimizedComilerSettings,
      "contracts/infinitism-entrypoint/core/EntryPoint.sol": optimizedComilerSettings,
      "contracts/infinitism-entrypoint/core/EntryPointSimulations.sol":
        optimizedComilerSettings,
    },
  },
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0,
    },
    dev: {
      url: "http://localhost:8545",
    },
  },
}

export default config
