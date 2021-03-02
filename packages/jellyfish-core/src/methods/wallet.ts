import {Client} from '../api'

interface AddressInfo {
  address: string
  hex?: string
}

export class Wallet {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async getAddressInfo(address: string): Promise<AddressInfo> {
    return this.client.call('getaddressinfo', [address])
  }
}
