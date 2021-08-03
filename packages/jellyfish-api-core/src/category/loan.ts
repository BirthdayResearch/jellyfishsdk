import { ApiClient } from '../.'

/**
 * loan RPCs for DeFi Blockchain
 */
export class Loan {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  async getCollateralToken (token: string, height: number): Promise<any> {
    return await this.client.call('getcollateraltoken', [{ token, height }], 'number')
  }
}
