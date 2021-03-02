import {Client} from '../api'

export class Blockchain {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async getBestBlockHash(): Promise<any> {
    return await this.client.call('getbestblockhash', [])
  }
}
