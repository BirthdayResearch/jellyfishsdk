import { BigNumber, ApiClient } from '../.'

/**
 * Wallet related RPC calls for DeFiChain
 */
export class Wallet {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Returns the total available balance in wallet.
   *
   * @param minimumConfirmation to include transactions confirmed at least this many times
   * @param includeWatchOnly for watch-only wallets
   * @return Promise<BigNumber>
   */
  async getBalance (minimumConfirmation: number = 0, includeWatchOnly: boolean = false): Promise<BigNumber> {
    return await this.client.call('getbalance', ['*', minimumConfirmation, includeWatchOnly], 'bignumber')
  }

  /**
   * Get list of UTXOs in wallet.
   *
   * @param minimumConfirmation default = 1, to filter
   * @param maximumConfirmation default = 9999999, to filter
   * @param options
   * @param options.addresses to filter
   * @param options.includeUnsafe default = true, include outputs that are not safe to spend
   * @param options.queryOptions
   * @param options.queryOptions.minimumAmount default = 0, minimum value of each UTXO
   * @param options.queryOptions.maximumAmount default is 'unlimited', maximum value of each UTXO
   * @param options.queryOptions.maximumCount default is 'unlimited', maximum number of UTXOs
   * @param options.queryOptions.minimumSumAmount default is 'unlimited', minimum sum valie of all UTXOs
   * @param options.queryOptions.tokenId default is 'all', filter by token
   * @return Promise<UTXO[]>
  */
  async listUnspent (
    minimumConfirmation = 1,
    maximumConfirmation = 9999999,
    options: ListUnspentOptions = {}
  ): Promise<UTXO[]> {
    const { addresses = [], includeUnsafe = true, queryOptions = {} } = options

    return await this.client.call(
      'listunspent',
      [
        minimumConfirmation, maximumConfirmation,
        addresses, includeUnsafe, queryOptions
      ],
      { amount: 'bignumber' }
    )
  }
}

export interface UTXO {
  txid: string
  vout: number
  address: string
  label: string
  scriptPubKey: string
  amount: BigNumber
  tokenId: number
  confirmations: number
  redeemScript: number
  witnessScript: number
  spendable: boolean
  solvable: boolean
  reused: string
  desc: string
  safe: boolean
}

export interface ListUnspentOptions {
  addresses?: string[]
  includeUnsafe?: boolean
  queryOptions?: ListUnspentQueryOptions
}

export interface ListUnspentQueryOptions {
  minimumAmount?: number
  maximumAmount?: number
  maximumCount?: number
  minimumSumAmount?: number
  tokenId?: string
}
