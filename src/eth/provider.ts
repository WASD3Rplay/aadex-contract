import { BigNumber, BytesLike, Wallet, ethers } from "ethers"
import { Web3Provider } from "zksync-ethers"
import { Web3Provider as EthersWeb3Provider, ExternalProvider } from "@ethersproject/providers"
import { getChainRpcUrl } from "../config"

export class EthProvider {
  public provider

  constructor(provider: any) {
    this.provider = provider
  }

  getChainId = async (): Promise<number> => {
    const network = await this.getNetwork()
    return network.chainId
  }

  getBlockNumber = async (): Promise<number> => {
    return this.provider.getBlockNumber()
  }

  getTx = async (txhash: string) => {
    return this.provider.getTransaction(txhash)
  }

  waitForTx = async (txhash: string) => {
    return this.provider.waitForTransaction(txhash)
  }

  getTxReceipt = async (txhash: string) => {
    return this.provider.getTransactionReceipt(txhash)
  }

  getBalance = async (addr: string): Promise<string> => {
    const balance = await this.provider.getBalance(addr)
    return ethers.utils.formatEther(balance)
  }

  getNetwork = async (): Promise<any> => {
    return await this.provider.getNetwork()
  }

  getGasLimit = async (
    from: string,
    to: string,
    data: BytesLike,
  ): Promise<BigNumber> => {
    return await this.provider.estimateGas({
      from,
      to,
      data,
    })
  }

  getBaseFeePerGas = async (): Promise<BigNumber> => {
    const block = await this.provider.getBlock("latest")
    return block.baseFeePerGas
  }

  getWallet = (addressOrIndex?: string | number): Wallet => {
    return this.provider.getSigner(addressOrIndex)
  }

  loadWallet = (privateKey: string): Wallet => {
    return new Wallet(privateKey, this.provider)
  }

  loadWalletFromMnemonic = (mnemonic: string): Wallet => {
    return Wallet.fromMnemonic(mnemonic).connect(this.provider)
  }
}

export const getEthProvider = (url?: any): EthProvider => {
  if (url === undefined) {
    url = getChainRpcUrl()
  }

  // Initialize the Ethers Web3Provider
  const jsonRpcProvider = new ethers.providers.JsonRpcProvider(url);

  // Directly adapt the jsonRpcProvider to match the ExternalProvider interface
  const adaptedProvider: ExternalProvider = {
    request: (request: { method: string; params?: any[] }) => jsonRpcProvider.send(request.method, request.params || []),
  };

  // Use the adaptedProvider with the Web3Provider from zksync-ethers
  return new EthProvider(new Web3Provider(adaptedProvider));


  // const ethersWeb3Provider = new EthersWeb3Provider(url);

  // // Create an adapter to match the ExternalProvider interface
  // const adaptedProvider: ExternalProvider = {
  //   request: ({ method, params }) => ethersWeb3Provider.send(method, params as any[]),
  //   send: (request, callback) => {
  //     ethersWeb3Provider.send(request.method, request.params as any[])
  //       .then(response => callback(null, {result: response}))
  //       .catch(error => callback(error, null));
  //   }
  // };

  // // Use the adaptedProvider with the Web3Provider from zksync-ethers
  // return new EthProvider(new Web3Provider(adaptedProvider));

  // return new EthProvider(new Web3Provider(new EthersWeb3Provider(url)));
}
