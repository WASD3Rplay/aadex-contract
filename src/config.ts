import "dotenv/config"

export const getChainRpcUrl = (): string => {
  return process.env.NODE_CHAIN_RPC_URL ?? "http://127.0.0.1:8545/"
}

export const getSignerSecret = (throwErr = true): string => {
  const value = process.env.NODE_SIGNER_SECRET
  if (throwErr && value === undefined) {
    throw new Error("Cannot find a signer secret")
  }
  return value ?? ""
}

export const getEntryPointAddress = (throwErr = true): string => {
  const addr = process.env.NODE_ENTRY_POINT_ADDRESS
  if (throwErr && addr === undefined) {
    throw new Error("Cannot find EntryPoint contract address")
  }
  return addr ?? ""
}

export const getDexManagerAddress = (throwErr = true): string => {
  const addr = process.env.NODE_DEX_MANAGER_ADDRESS
  if (throwErr && addr === undefined) {
    throw new Error("Cannot find DexManager contract address")
  }
  return addr ?? ""
}

export const getTokenContractAddress = (symbol: string, throwErr = true): string => {
  const value = process.env[`NODE_TOKEN_CONTRACT_ADDRESS_${symbol}`]
  if (throwErr && value === undefined) {
    throw new Error(`Cannot find a token contract for ${symbol}`)
  }
  return value ?? ""
}

export const getAccountSecret = (name: string, throwErr = true): string => {
  const value = process.env[`NODE_DEX_ACCOUNT_SECRET_${name}`]
  if (throwErr && value === undefined) {
    throw new Error(`Cannot find a account secret of ${name}`)
  }
  return value ?? ""
}
