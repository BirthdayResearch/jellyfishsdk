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

  async listLoanSchemes (): Promise<LoanSchemeResult[]> {
    return await this.client.call('listloanschemes', [], 'bignumber')
  }
}

export interface LoanSchemeResult{
  id: string
  mincolratio: BigNumber
  interestrate: BigNumber
  default: boolean
}
