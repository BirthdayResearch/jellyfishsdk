import 'url-search-params-polyfill'
import { OceanApiClientOptions, OceanApiClient, ApiPagedResponse } from '@defichain/ocean-api-client'

/**
 * RichListApiClient configurable options
 */
export interface RichListApiClientOptions extends OceanApiClientOptions {}

/**
 * RichListApiClient
 */
export class RichListApiClient extends OceanApiClient {
  constructor (
    protected readonly options: RichListApiClientOptions
  ) {
    const opts = options = {
      url: 'https://rich-list.defichain.com', // TBD
      timeout: 60000,
      version: 'v0',
      network: 'mainnet',
      ...options
    }

    super(opts)
    this.options = opts
    this.options.url = this.options.url?.replace(/\/$/, '')
  }

  async get (tokenId: string): Promise<ApiPagedResponse<RichListItem>> {
    return await this.requestList('GET', `rich-list/${tokenId}`, 1000)
  }
}

export interface RichListItem {
  address: string
  amount: number
}
