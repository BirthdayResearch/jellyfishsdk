import { BigNumber } from '@defichain/jellyfish-json'
import { ApiClient } from '../.'

type TokenRegexType = `${number}@${string}`

/**
 * Token RPCs for DeFi Blockchain
 */
export class Token {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Creates a token with given metadata
   *
   * @param {CreateTokenMetadata} metadata
   * @param {string} metadata.symbol token's symbol (unique)
   * @param {string} metadata.name token's name (unique)
   * @param {boolean} metadata.isDAT default = false
   * @param {boolean} metadata.mintable default = true
   * @param {boolean} metadata.tradeable default = true
   * @param {string} metadata.collateralAddress for keeping collateral amount
   * @param {UTXO[]} utxos array of specific UTXOs to spend
   * @param {string} utxos.txid
   * @param {number} utxos.vout
   * @return {Promise<string>}
   */
  async createToken (metadata: CreateTokenMetadata, utxos: UTXO[] = []): Promise<string> {
    const defaultMetadata = {
      isDAT: false,
      mintable: true,
      tradeable: true
    }
    return await this.client.call('createtoken', [{ ...defaultMetadata, ...metadata }, utxos], 'number')
  }

  /**
   * Updates a token with given metadata
   *
   * @param {string} token symbolKey, id ror creation tx
   * @param {UpdateTokenMetadata} [metadata]
   * @param {string} [metadata.symbol]
   * @param {string} [metadata.name]
   * @param {boolean} [metadata.isDAT]
   * @param {boolean} [metadata.mintable]
   * @param {boolean} [metadata.tradeable]
   * @param {boolean} [metadata.finalize]
   * @return {Promise<string>}
   */
  async updateToken (token: string, metadata?: UpdateTokenMetadata): Promise<string> {
    return await this.client.call('updatetoken', [token, metadata], 'number')
  }

  /**
   * Returns information about tokens
   *
   * @param {TokenPagination} pagination
   * @param {number} pagination.start
   * @param {boolean} pagination.including_start
   * @param {number} pagination.limit
   * @param {boolean} verbose
   * @return {Promise<TokenResult>}
   */
  async listTokens (
    pagination: TokenPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true
  ): Promise<TokenResult> {
    return await this.client.call('listtokens', [pagination, verbose], 'bignumber')
  }

  /**
   * Return information about token
   *
   * @param {string} symbolKey
   * @return {Promise<TokenResult>}
   */
  async getToken (symbolKey: string): Promise<TokenResult> {
    // Note(canonbrother): only 'limit' and 'minted' is bignumber
    // but the 'return' contains random id which is not be able to map precision exactly
    // precision: { '0': limit: 'bignumber', minted: 'bignumber'}
    return await this.client.call('gettoken', [symbolKey], 'bignumber')
  }

  /**
   * Creates a transaction to mint tokens.
   *
   * @param {TokenRegexType} payload
   * @param {UTXO[]} [utxos = []]
   * @param {string} [utxos.txid]
   * @param {number} [utxos.vout]
   * @return {Promise<string>}
   */
  async mintTokens (payload: TokenRegexType, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('minttokens', [payload, utxos], 'number')
  }
}

export interface TokenResult {
  [id: string]: TokenInfo
}

export interface TokenInfo {
  symbol: string
  symbolKey: string
  name: string
  decimal: BigNumber
  limit: BigNumber
  mintable: boolean
  tradeable: boolean
  isDAT: boolean
  isLPS: boolean
  finalized: boolean
  minted: BigNumber
  creationTx: string
  creationHeight: BigNumber
  destructionTx: string
  destructionHeight: BigNumber
  collateralAddress: string
}

export interface CreateTokenMetadata {
  symbol: string
  name: string
  isDAT: boolean
  mintable: boolean
  tradeable: boolean
  collateralAddress: string
}

export interface UpdateTokenMetadata {
  symbol?: string
  name?: string
  isDAT?: boolean
  mintable?: boolean
  tradeable?: boolean
  finalize?: boolean
}

export interface TokenPagination {
  start: number
  including_start: boolean
  limit: number
}

export interface UTXO {
  txid: string
  vout: number
}
