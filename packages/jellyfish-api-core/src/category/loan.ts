import { ApiClient } from '../.'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async updateLoanToken (token: string, metadata: UpdateLoanTokenMetaData, options?: UpdateLoanTokenOptions): Promise<string> {
    // TODO jingyi2811
    // There is a bug in the c++ side
    // utxos should not be object, should be array instead
    const {
      symbol,
      name,
      priceFeedId,
      mintable = undefined,
      interest = 0
    } = metadata
    const utxos = options?.utxos ?? []
    return await this.client.call('updateloantoken', [
      {
        token
      },
      {
        symbol,
        name,
        priceFeedId,
        mintable,
        interest
      },
      utxos
    ], 'number')
  }
}

export interface UpdateLoanTokenMetaData {
  symbol: string
  name: string
  priceFeedId: string
  mintable?: boolean
  interest?: number
}

export interface UpdateLoanTokenOptions {
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
}
