import { ApiClient } from '../.'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async listVaults (): Promise<VaultData> {
    return await this.client.call('listvaults', [], 'number')
  }
}
export interface VaultData {
  [key: string]: VaultDetail
}

export interface VaultDetail {
  owneraddress: string
  loanschemeid: string
  isliquidated: boolean
}
