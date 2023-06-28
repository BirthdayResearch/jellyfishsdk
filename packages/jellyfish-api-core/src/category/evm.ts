import { ApiClient, BigNumber } from '../.'

/**
 * EVM RPCs for DeFi Blockchain
 */
export class Evm {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Creates an EVM transaction submitted to local node and network
   * @param {string} from
   * @param {number} nonce
   * @param {number} gasPrice
   * @param {number} gasLimit
   * @param {string} to
   * @param {BigNumber} value
   * @param {string} [data]
   * @returns {Promise<string>}
   */
  async evmtx ({ from, nonce, gasPrice, gasLimit, to, value, data }: EvmTxOptions): Promise<string> {
    return await this.client.call('evmtx', [from, nonce, gasPrice, gasLimit, to, value, data], 'bignumber')
  }
}

export interface EvmTxOptions {
  from: string
  nonce: number
  gasPrice: number
  gasLimit: number
  to: string
  value: BigNumber
  data?: string
}
