import BigNumber from 'bignumber.js'
import { ApiClient } from '../.'

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
   * @param {string} amountToken formatted as `${number}@${string}`
   * @param {UTXO[]} [utxos = []]
   * @param {string} [utxos.txid]
   * @param {number} [utxos.vout]
   * @return {Promise<string>}
   */
  async mintTokens (amountToken: string, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('minttokens', [amountToken, utxos], 'number')
  }

  /**
   * Creates a transaction to burn tokens.
   *
   * @param {string} amounts Amount as json string, or array. Example: '[ \"amount@token\" ]'
   * @param {string} [from] Address containing tokens to be burned
   * @param {string} [context] Additional data necessary for specific burn type
   * @param {UTXO[]} [utxos = []] A json array of json objects. Provide it if you want to spent specific UTXOs
   * @param {string} [utxos.txid] The transaction id
   * @param {number} [utxos.vout] The output number
   * @return {Promise<string>} The hex-encoded hash of broadcasted transaction
   */
  async burnTokens (amounts: string, from?: string, context?: string, utxos: UTXO[] = []): Promise<string> {
    return await this.client.call('burntokens', [{ amounts, from, context }, utxos], 'number')
  }

  /**
   * Get detailed information about any custom transaction.
   *
   * @param {string} txid Transaction hash
   * @param {string} [blockhash] (for confirmed transactions) Hash of the block of the  transaction
   * @return {Promise<GetCustomTxResult | string>} Inferred custom transaction data, or error message
   */
  async getCustomTx (txid: string, blockhash?: string): Promise<GetCustomTxResult | string> {
    return await this.client.call('getcustomtx', [txid, blockhash], 'number')
  }

  /**
   * Get detailed information about any custom transaction from the raw transaction.
   *
   * @param {string} hexstring Serialised custom transaction data
   * @param {boolean} [iswitness] is the transaction a serialised witness transaction
   * @return {Promise<DecodeCustomTxResult | string>} Inferred custom transaction data, or error message
   */
  async decodeCustomTx (hexstring: string, iswitness?: boolean): Promise<DecodeCustomTxResult | string> {
    if (iswitness === undefined) {
      return await this.client.call('decodecustomtx', [hexstring], 'number')
    }
    return await this.client.call('decodecustomtx', [hexstring, iswitness], 'number')
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
  isLoanToken: boolean
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

export interface GetCustomTxResult {
  type: string
  valid: boolean
  results: object
  blockHeight: string
  blockhash: string
  confirmations: number
}

export interface DecodeCustomTxResult {
  txid: string
  type: string
  valid: boolean
  results: object
}
