import { ApiClient, BigNumber } from '../.'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async setColleteralToken (token: string, factor: BigNumber, options: SetColleteralTokenOptions): Promise<string> {
    const { activateAfterBlock = undefined, utxos = [] } = options
    return await this.client.call('setcollateraltoken', [
      {
        token,
        factor,
        priceFeedId: options.priceFeedId,
        activateAfterBlock
      }, utxos
    ], 'number')
  }
}

export interface SetColleteralTokenOptions {
  priceFeedId: string
  activateAfterBlock?: number
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
}
