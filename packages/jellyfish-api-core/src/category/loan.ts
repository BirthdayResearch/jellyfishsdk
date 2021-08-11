import { ApiClient } from '../.'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async setLoanToken (symbol: string, name: string, options: SetLoanTokenOptions): Promise<string> {
    const { mintable = undefined, interest = 0, utxos = [] } = options
    return await this.client.call('setloantoken', [
      {
        symbol,
        name,
        priceFeedId: options.priceFeedId,
        mintable: mintable,
        interest: interest
      }, utxos
    ], 'number')
  }
}

export interface SetLoanTokenOptions {
  priceFeedId: string
  mintable?: boolean
  interest?: number
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
}
