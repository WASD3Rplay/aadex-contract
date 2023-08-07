import "@nomiclabs/hardhat-ethers"
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
      "contracts/aadex/Wasd3rDexManager.sol": optimizedComilerSettings,
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
