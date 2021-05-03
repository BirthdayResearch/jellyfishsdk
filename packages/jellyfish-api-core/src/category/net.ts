import { ApiClient } from '../.'

/**
 * Net RPCs for DeFi Blockchain
 */
export class Net {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Returns the number of connections to other nodes.
   *
   * @return {Promise<number>}
   */
  async getConnectionCount (): Promise<number> {
    return await this.client.call('getconnectioncount', [], 'number')
  }

  /**
   * Returns an object containing various state info regarding P2P networking.
   *
   * @return {Promise<NetworkInfo>}
   */
  async getNetworkInfo (): Promise<NetworkInfo> {
    return await this.client.call('getnetworkinfo', [], 'number')
  }
}

export interface NetworkInfo {
  version: number
  subversion: string
  protocolversion: number
  localservices: string
  localrelay: boolean
  timeoffset: number
  connections: number
  networkactive: boolean
  networks: Network[]
  relayfee: number
  incrementalfee: number
  localaddresses: LocalAddress[]
  warnings: string
}

export interface Network {
  name: string
  limited: boolean
  reachable: boolean
  proxy: string
  proxy_randomize_credentials: boolean
}

export interface LocalAddress {
  address: string
  port: number
  score: number
}
