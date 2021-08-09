import { ApiClient } from '../.'
import BigNumber from 'bignumber.js'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async listLoanTokens (): Promise<ListLoanTokenData> {
    return await this.client.call('listloantokens', [], 'bignumber')
  }
}

export interface ListLoanTokenData {
  [key: string]: ListLoanTokenDetail
}

export interface ListLoanTokenDetail {
  token: TokenData
  priceFeedId: string
  interest: BigNumber
}

export interface TokenData {
  [key: string]: TokenDetail
}

export interface TokenDetail {
  collateralAddress: string
  creationHeight: BigNumber
  creationTx: string
  decimal: BigNumber
  destructionHeight: BigNumber
  destructionTx: string
  finalized: false
  isDAT: boolean
  isLPS: boolean
  isLoanToken: boolean
  limit: BigNumber
  mintable: boolean
  minted: BigNumber
  name: string
  symbol: string
  symbolKey: string
  tradeable: boolean
}
