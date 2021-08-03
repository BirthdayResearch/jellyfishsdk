import { ApiClient } from '../.'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async listCollateralTokens (): Promise<CollateralTokensData> {
    return await this.client.call('listcollateraltokens', [], 'number')
  }
}

export interface CollateralTokensData {
  [key: string]: CollateralTokensDetail
}

export interface CollateralTokensDetail {
  token: string
  factor: number
  priceFeedId: string
  activateAfterBlock: number
}
