import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@typechain/hardhat"
import { HardhatUserConfig } from "hardhat/config"

const optimizedComilerSettings = {
  version: "0.8.18",
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
        version: "0.8.18",
      },
    ],
    overrides: {
      "contracts/aadex/AADexManager.sol": optimizedComilerSettings,
      "contracts/accounts/AADexSwapCaller.sol": optimizedComilerSettings,
      "contracts/entrypoint/AADexEntryPoint.sol": optimizedComilerSettings,
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
