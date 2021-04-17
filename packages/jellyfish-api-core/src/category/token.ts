import { ApiClient } from '../.'

/**
 * Token related RPC calls for DeFiChain
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
   * @param {CreateTokenUTXO[]} utxos array of specific UTXOs to spend
   * @param {string} utxos.txid
   * @param {number} utxos.vout
   * @return Promise<string>
   */
  async createToken (metadata: CreateTokenMetadata, utxos: CreateTokenUTXO[] = []): Promise<string> {
    const defaultMetadata = {
      isDAT: false,
      mintable: true,
      tradeable: true
    }
    return await this.client.call('createtoken', [{ ...defaultMetadata, ...metadata }, utxos], 'number')
  }

  /**
   * Returns information about tokens
   *
   * @param {TokenPagination} pagination
   * @param {number} pagination.start
   * @param {boolean} pagination.including_start
   * @param {number} pagination.limit
   * @param {boolean} verbose
   * @return Promise<IToken>
   */
  async listTokens (
    pagination: TokenPagination = {
      start: 0,
      including_start: true,
      limit: 100
    },
    verbose = true
  ): Promise<IToken> {
    return await this.client.call('listtokens', [pagination, verbose], 'number')
  }

  /**
   * Return information about token
   *
   * @param {string} symbol
   * @return Promise<Token>
   */
  async getToken (symbol: string): Promise<IToken> {
    return await this.client.call('gettoken', [symbol], 'number')
  }
}

export interface IToken {
  [id: string]: {
    symbol: string
    symbolKey: string
    name: string
    decimal: number
    limit: number
    mintable: boolean
    tradeable: boolean
    isDAT: boolean
    isLPS: boolean
    finalized: boolean
    minted: number
    creationTx: string
    creationHeight: number
    destructionTx: string
    destructionHeight: number
    collateralAddress: string
  }
}

export interface CreateTokenMetadata {
  symbol: string
  name: string
  isDAT: boolean
  mintable: boolean
  tradeable: boolean
  collateralAddress: string
}

export interface CreateTokenUTXO {
  txid: string
  vout: number
}

export interface TokenPagination {
  start: number
  including_start: boolean
  limit: number
}
