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

const zkLinkCompilerSettings = {
  version: "0.8.17",
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
        version: "0.8.17",
      },
    ],
    overrides: {
      "contracts/aadex/AADexManager.sol": zkLinkCompilerSettings,
      "contracts/accounts/AADexSwapCaller.sol": zkLinkCompilerSettings,
      "contracts/entrypoint/AADexEntryPoint.sol": zkLinkCompilerSettings,
    },
  },
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0,
    },
    dev: {
      url: "http://localhost:8545",
    },
	zkLinkGoerliTestnet: {
      url: "https://goerli.rpc.zklink.io",
      ethNetwork: "goerli",
      zksync: true,
      verifyURL: "https://goerli.explorer.zklink.io/contracts/verify",
    },
  },
  zksolc: {
    version: "1.3.21",
    settings: {
      // find all available options in the official documentation
      // https://era.zksync.io/docs/tools/hardhat/hardhat-zksync-solc.html#configuration
    },
  },
}

export default config
