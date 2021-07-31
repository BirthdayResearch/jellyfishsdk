import { ApiClient } from '../.'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async updateLoanScheme (ratio: number, rate: number, options: UpdateLoanOptions): Promise<string> {
    const { activateAfterBlock = undefined, utxos = [] } = options
    return await this.client.call('updateloanscheme', [ratio, rate, options.identifier, activateAfterBlock, utxos], 'number')
  }
}

export interface UpdateLoanOptions {
  identifier: string
  activateAfterBlock?: number
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
}
