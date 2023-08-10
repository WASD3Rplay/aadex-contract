import { Wallet, ethers } from "ethers"

import { ERC20ContractCtrl } from "../contract"

import { TxReceipt } from "./txreceipt"

export const getEthBalance = async (
  ethProvider: any,
  addr: string,
): Promise<string> => {
  const balance = await ethProvider.getBalance(addr)
  return balance
}

export const getErc20Balance = async (
  contract: ERC20ContractCtrl,
  addr: string,
): Promise<string> => {
  const balance = await contract.balanceOf(addr)
  return balance
}

export const transferEth = async (
  fromWallet: Wallet,
  toAddr: string,
  amount: string,
): Promise<TxReceipt> => {
  const rawTx = {
    to: toAddr,
    value: ethers.utils.parseEther(amount),
  }
  const tx = await fromWallet.sendTransaction(rawTx)
  const receipt = await tx.wait()
  return new TxReceipt(receipt)
}
