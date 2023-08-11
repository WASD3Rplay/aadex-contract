# AA DEX contract

Smart Contracts for AA (EIP-4337) decentrelized exchange, DEX.

## Install

```shell
npm add @wasd3rplay/aadex-contract
```

### Quickstart

```typescript
import {
  getDexManagerContractCtrl,
  getEthProvider,
} from "@wasd3rplay/aadex-contract";
import { Wallet } from "ethers";

const ENTRY_POINT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const DEX_MANAGER_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const ethProvider = getEthProvider("http://127.0.0.1:8545/");
const signerWallet = ethProvider.loadWalletFromMnemonic(
  "announce room limb pattern dry unit scale effort smooth jazz weasel alcohol",
);

const contractCtrl = await getDexManagerContractCtrl(
  ethProvider,
  signerWallet,
  ENTRY_POINT_ADDRESS,
  DEX_MANAGER_ADDRESS,
);
const nativeTokenKey = await contractCtrl.getNativeTokenKey();
console.log("Native token (ETH) key in AA DEX:", nativeTokenKey);
```

## Setup Dev Env

### Clone repository

```shell
git clone git@github.com:WASD3Rplay/aadex-contract.git
```

#### Using [VSCode](https://code.visualstudio.com/)

Copy the `settings.json` file into the vscode settings directory (`.vscode`).

- On Mac

  ```shell
  mkdir .vscode
  cp ./dev/vscode/settings.json ./.vscode/settings.json
  ```

### Prepare [NodeJs](https://nodejs.org)

Recommend version is 18.

[nvm](https://github.com/nvm-sh/nvm) would make this easy:

```shell
nvm use 18
node --version
```

### Prepare `.env`

First, copy the `dotenv` file as a `.env`

```shell
cp dotenv .env
```

The `dotenv` has already configs for local dev environment.

Please change the file to the appropriate environment before run commands below.

e.g. for Ethereum `Sepolia` testnet:

```yaml
NODE_CHAIN_RPC_URL="https://sepolia.infura.io/v3/<api_key>"
NODE_ENTRY_POINT_ADDRESS="<contract_address_after_run_deploy-contracts>"
NODE_DEX_MANAGER_ADDRESS="<contract_address_after_run_deploy-contracts>"
NODE_SIGNER_SECRET="<signer_private_key_to_own_contracts>"

# Token contract addresses
NODE_TOKEN_CONTRACT_ADDRESS_USDT="<contract_address_after_run_deploy-sample-usdt>"
NODE_TOKEN_CONTRACT_ADDRESS_WETH="<contract_address_after_run_deploy-sample-weth>"
```

## Commands

### Compile smart contract

```shell
npm run compile
```

### Clean compiled objects

```shell
npm run clean
```

### Run local EVM node

```shell
npx hardhat node
```

### Deploy contracts

```shell
npm run deploy-aadex
```

Before run this command, a EVM node should be ready.

### Deploy sample ERC20 contract

Before run the below NPM command, the `EntryPoint` and `DexManager` contracts should be deployed and set those contract addresses in the `.env` file.

```yaml
NODE_ENTRY_POINT_ADDRESS="<contract_address_after_run_deploy-contracts>"
NODE_DEX_MANAGER_ADDRESS="<contract_address_after_run_deploy-contracts>"
```

```shell
npm run deploy-sample-usdt
# or
npm run deploy-sample-weth
```

### Deposit native token (ETH) in AA Dex

```shell
npm run deposit-native
```

Before run this command, the `EntryPoint` and `DexManager` contracts should be deployed and set those contract addresses in the `.env` file.

```yaml
NODE_ENTRY_POINT_ADDRESS="<contract_address_after_run_deploy-contracts>"
NODE_DEX_MANAGER_ADDRESS="<contract_address_after_run_deploy-contracts>"
```

### Deposit sample ERC20 token in AA Dex

```shell
npm run deposit-sample-usdt
```

Before run this command, the sample USDT contract should be deployed and set the contract address in the `.env` file.

```yaml
NODE_TOKEN_CONTRACT_ADDRESS_USDT="<contract_address_after_run_deploy-sample-usdt>"
```

### Swap native token and USDT in AA Dex

```shell
npm run swap-sample-native-usdt
```

Before run this command, the `EntryPoint`, `DexManager`, and `Erc20USDT` contracts should be deployed and set those contract address in the `.env` file.

```yaml
NODE_ENTRY_POINT_ADDRESS="<contract_address_after_run_deploy-contracts>"
NODE_DEX_MANAGER_ADDRESS="<contract_address_after_run_deploy-contracts>"

# Token contract addresses
NODE_TOKEN_CONTRACT_ADDRESS_USDT="<contract_address_after_run_deploy-sample-usdt>"
```

Additionally, `Alice` and `Bill`, who are pretended customers of AA Dex, account secrets are needed in the `.env` file.

```yaml
# AA Dex accounts
NODE_DEX_ACCOUNT_SECRET_ALICE="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
NODE_DEX_ACCOUNT_SECRET_BILL="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
```

You can use the above data in any test network.

But, do NOT use this data in any mainnet network because these data is provided by hardhat dev node with `npx hardhat node`.
