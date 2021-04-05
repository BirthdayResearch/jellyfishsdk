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
   * @return Promise<number>
   */
  async getBalance (minimumConfirmation: number = 0, includeWatchOnly: boolean = false): Promise<BigNumber> {
    return await this.client.call('getbalance', ['*', minimumConfirmation, includeWatchOnly], 'bignumber')
  }

  /**
   * Get list of UTXOs in wallet.
   *
   * @param listUnspentPayload
   * @param listUnspentPayload.minimumConfirmation optional, default = 1, to filter
   * @param listUnspentPayload.maximumConfirmation optional, default = 9999999, to filter
   * @param listUnspentPayload.addresses optional, to filter
   * @param listUnspentPayload.includeUnsafe optional, default = true, include outputs that are not safe to spend
   * @param listUnspentPayload.queryOptions optional
   * @param listUnspentPayload.queryOptions.minimumAmount optional, default = 0, minimum value of each UTXO
   * @param listUnspentPayload.queryOptions.maximumAmount optional, default = ∞, maximum value of each UTXO
   * @param listUnspentPayload.queryOptions.maximumCount optional, default = ∞, maximum number of UTXOs
   * @param listUnspentPayload.queryOptions.minimumSumAmount optional, default = ∞, minimum sum valie of all UTXOs
   * @param listUnspentPayload.queryOptions.tokenId optional, default = all, filter by token
   * @return Promise<UTXO[]>
  */
  async listUnspent ({
    minimumConfirmation,
    maximumConfirmation,
    addresses,
    includeUnsafe,
    queryOptions
  }: {
    minimumConfirmation?: number
    maximumConfirmation?: number
    addresses?: string[]
    includeUnsafe?: boolean
    queryOptions?: ListUnspentQueryOptions
  } = {}): Promise<UTXO[]> {
    return await this.client.call(
      'listunspent',
      [minimumConfirmation, maximumConfirmation, addresses, includeUnsafe, queryOptions],
      'number'
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

export interface ListUnspentPayload {
  minimumConfirmation?: number
  maximumConfirmation?: number
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
