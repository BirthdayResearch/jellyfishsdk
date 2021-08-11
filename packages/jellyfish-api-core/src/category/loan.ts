import { ApiClient } from '../.'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async createVault (owneraddress: string, loanschemeid: string, options: CreateVaultOptions = {}): Promise<string> {
    const { utxos = [] } = options
    return await this.client.call('createvault', [owneraddress, loanschemeid, utxos], 'number')
  }
}

export interface CreateVaultOptions {
  utxos?: UTXO[]
}

export interface UTXO {
  txid: string
  vout: number
}
