import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

export class Tokens {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Paginate query tokens.
   *
   * @param {number} size of tokens to query
   * @param {string} next set of tokens
   * @return {Promise<ApiPagedResponse<TokenData>>}
   */
  async list (size: number = 30, next?: string): Promise<ApiPagedResponse<TokenData>> {
    return await this.client.requestList('GET', 'tokens', size, next)
  }

  /**
   * Get information about a token with id of the token.
   *
   * @param {string} id
   * @return {Promise<TokenData>}
   */
  async get (id: string): Promise<TokenData> {
    return await this.client.requestData('GET', `tokens/${id}`)
  }
}

/**
 * Tokens data.
 */
export interface TokenData {
  id: string
  symbol: string
  displaySymbol: string
  symbolKey: string
  name: string
  decimal: number
  limit: string // BigNumber
  mintable: boolean
  tradeable: boolean
  isDAT: boolean
  isLPS: boolean
  isLoanToken: boolean
  finalized: boolean
  minted: string // BigNumber
  creation: {
    tx: string
    height: number
  }
  destruction: {
    tx: string
    height: number
  }
  collateralAddress?: string
}
