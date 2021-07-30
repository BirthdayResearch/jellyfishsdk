import { ApiClient } from '../.'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async listLoanSchemes (): Promise<LoanSchemeResult[]> {
    return await this.client.call('listloanschemes', [], 'number')
  }
}

export interface LoanSchemeResult{
  id: string
  mincolratio: number
  interestrate: number
  default: boolean
}
