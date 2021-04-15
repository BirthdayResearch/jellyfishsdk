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
   * @param metadata
   * @param utoxs array of specific UTXOs to spend
   */
  async createToken (metadata: CreateTokenMetadata, utxos: CreateTokenUTXO[] = []): Promise<string> {
    return await this.client.call('createtoken', [metadata, utxos], 'number')
  }

  /**
   * Returns information about tokens
   *
   * @param pagination
   * @param verbose
   * @return Promise<Token>
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
   * @param symbol
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
  decimal: number
  limit: number
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
