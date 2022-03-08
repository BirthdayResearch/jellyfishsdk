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
   * Returns data about each connected network node as a json array of objects.
   *
   * @return {Promise<PeerInfo[]>}
   */
  async getPeerInfo (): Promise<PeerInfo[]> {
    return await this.client.call('getpeerinfo', [], 'number')
  }

  /**
   * Returns an object containing various state info regarding P2P networking.
   *
   * @return {Promise<NetworkInfo>}
   */
  async getNetworkInfo (): Promise<NetworkInfo> {
    return await this.client.call('getnetworkinfo', [], 'number')
  }

  /**
   * Disable/enable all p2p network activity.
   *
   * @param state true to enable networking, false to disable
   * @return {Promise<boolean>} current network state
   */
  async setNetworkActive (state: boolean): Promise<boolean> {
    return await this.client.call('setnetworkactive', [state], 'number')
  }
}

export interface PeerInfo {
  id: number
  addr: string
  addrbind?: string
  addrlocal?: string
  services: string
  relaytxes: boolean
  lastsend: number
  lastrecv: number
  bytessent: number
  bytesrecv: number
  conntime: number
  timeoffset: number
  pingtime?: number
  minping?: number
  pingwait?: number
  version: number
  subver: string
  inbound: boolean
  addnode: boolean
  startingheight: number
  banscore?: number
  synced_headers?: number
  synced_blocks?: number
  inflight: number[]
  whitelisted: boolean
  permissions: string[]
  minfeefilter: number
  bytessent_per_msg: {
    [msg: string]: number
  }
  bytesrecv_per_msg: {
    [msg: string]: number
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
