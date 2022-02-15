import { WhaleApiClient } from '@defichain/whale-api-client'
import { Injectable } from '@nestjs/common'

type Network = 'mainnet' | 'testnet' | 'regtest'

@Injectable()
export class WhaleApiClientProvider {
  private readonly clientCacheByNetwork: Map<Network, WhaleApiClient> = new Map()

  /**
   * Lazily initialises WhaleApiClients and caches them by network for performance.
   * @param network - the network to connect to
   */
  getClient (network: Network): WhaleApiClient {
    const client = this.clientCacheByNetwork.get(network)
    if (client !== undefined) {
      return client
    }
    return this.createAndCacheClient(network)
  }

  private createAndCacheClient (network: Network): WhaleApiClient {
    const client = new WhaleApiClient({
      version: 'v0',
      network: network,
      url: 'https://ocean.defichain.com'
    })
    this.clientCacheByNetwork.set(network, client)
    return client
  }
}
