import { ApiClient } from '../.'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async createLoanScheme (ratio: number, rate: number, options: CreateLoanOptions): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('createloanscheme', [ratio, rate, options.identifier, utxos], 'number')
  }
}

export interface CreateLoanOptions {
  identifier: string
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
}
