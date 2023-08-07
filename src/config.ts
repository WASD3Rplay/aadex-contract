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
