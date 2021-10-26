import { WhaleApiClient } from '../whale.api.client'
import { ApiPagedResponse } from '../whale.api.response'

export class Loan {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * Paginate query loan schemes.
   *
   * @param {number} size of scheme to query
   * @param {string} next set of schemes
   * @return {Promise<ApiPagedResponse<LoanScheme>>}
   */
  async listScheme (size: number = 30, next?: string): Promise<ApiPagedResponse<LoanScheme>> {
    return await this.client.requestList('GET', 'loans/schemes', size, next)
  }

  /**
   * Get information about a scheme with given scheme id.
   *
   * @param {string} id scheme id to get
   * @return {Promise<LoanScheme>}
   */
  async getScheme (id: string): Promise<LoanScheme> {
    return await this.client.requestData('GET', `loans/schemes/${id}`)
  }

  /**
   * Paginate query loan collateral tokens.
   *
   * @param {number} size of collateral tokens to query
   * @param {string} next set of collateral tokens
   * @return {Promise<ApiPagedResponse<CollateralToken>>}
   */
  async listCollateral (size: number = 30, next?: string): Promise<ApiPagedResponse<CollateralToken>> {
    return await this.client.requestList('GET', 'loans/collaterals', size, next)
  }

  /**
   * Get information about a collateral token with given collateralToken id.
   *
   * @param {string} id collateralToken id to get
   * @return {Promise<CollateralToken>}
   */
  async getCollateral (id: string): Promise<CollateralToken> {
    return await this.client.requestData('GET', `loans/collaterals/${id}`)
  }
}

export interface LoanScheme {
  id: string
  minColRatio: string
  interestRate: string
}

export interface CollateralToken {
  token: string
  tokenId: string
  factor: string
  priceFeedId: string
  activateAfterBlock: number
}
