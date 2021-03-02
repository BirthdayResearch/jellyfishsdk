import {Client} from '../api'

export interface MintingInfo {
  blocks: number
  difficulty: number
  isoperator: boolean
  networkhashps: number
  pooledtx: number
  chain: 'main' | 'test' | 'regtest'
  warnings: string
}

export class Mining {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async getMintingInfo(): Promise<MintingInfo> {
    return this.client.call('getmintinginfo', [])
  }
}
