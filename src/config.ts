import {config} from "dotenv"
import * as path from 'path';

// Determine which .env file to use
const envFile = process.env.APP_ENV || '.env';

// Load the specified .env file
config({ path: path.resolve(__dirname, `../${envFile}`) });

export const getChainRpcUrl = (): string => {
  return process.env.NODE_CHAIN_RPC_URL ?? "http://127.0.0.1:8545/"
}

export const getSignerSecret = (throwErr = true): string => {
  const value = process.env.NODE_SIGNER_SECRET
  if (throwErr && (value === undefined || value.length === 0)) {
    throw new Error("Cannot find a signer secret")
  }
  return value ?? ""
}

export const getMarketAdminSecret = (throwErr = true): string => {
  const value = process.env.NODE_MARKET_ADMIN_SECRET
  if (throwErr && (value === undefined || value.length === 0)) {
    throw new Error("Cannot find a market admin secret")
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

export const getAdminAddress = (throwErr = true): string => {
  const addr = process.env.NODE_ADMIN_ADDRESS
  if (throwErr && addr === undefined) {
    throw new Error("Cannot find NODE_ADMIN_ADDRESS")
  }
  return addr ?? ""
}

export const getToAddress = (throwErr = true): string => {
  const addr = process.env.NODE_TO_ADDRESS
  if (throwErr && addr === undefined) {
    throw new Error("Cannot find NODE_TO_ADDRESS")
  }
  return addr ?? ""
}

export const getAmount = (throwErr = true): string => {
  const addr = process.env.NODE_AMOUNT
  if (throwErr && addr === undefined) {
    throw new Error("Cannot find NODE_AMOUNT")
  }
  return addr ?? ""
}

export const getSwapCallerAddress = (throwErr = true): string => {
  const addr = process.env.NODE_SWAP_CALLER_ADDRESS
  if (throwErr && addr === undefined) {
    throw new Error("Cannot find NODE_SWAP_CALLER_ADDRESS")
  }
  return addr ?? ""
}

export const getTokenSymbol = (throwErr = true): string => {
  const symbol = process.env.NODE_TOKEN_SYMBOL
  if (throwErr && symbol === undefined) {
    throw new Error("Cannot find NODE_TOKEN_SYMBOL")
  }
  return symbol ?? ""
}

export const getTokenContractAddress = (
  symbol: string | null = null,
  throwErr = true,
): string => {
  if (symbol === null) {
    symbol = getTokenSymbol()
  }

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
