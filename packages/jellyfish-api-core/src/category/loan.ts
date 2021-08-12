import { ApiClient } from '../.'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async destroyLoanScheme (id: string, activateAfterBlock?: number, options: DeleteLoanOptions = {}): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('destroyloanscheme', [id, activateAfterBlock, utxos], 'number')
  }
}

export interface DeleteLoanOptions {
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
}
