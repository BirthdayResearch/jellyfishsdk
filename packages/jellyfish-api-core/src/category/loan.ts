import { ApiClient } from '../.'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async getVault (vaultId: string): Promise<VaultData> {
    return await this.client.call('getvault', [vaultId], 'number')
  }
}

export interface VaultData {
  loanschemeid: string
  owneraddress: string
  isunderliquidation: false
}
