import { OceanApiClientOptions, OceanApiClient, ApiPagedResponse } from '@defichain/ocean-api-client'

/**
 * RichListApiClient
 */
export class RichListApiClient {
  private readonly oceanApiClient: OceanApiClient

  constructor (private readonly options: OceanApiClientOptions) {
    this.oceanApiClient = new OceanApiClient(options)
  }

  async get (tokenId: string): Promise<ApiPagedResponse<RichListItem>> {
    return await this.oceanApiClient.requestData('GET', `rich-list/${tokenId}`)
  }
}

export interface RichListItem {
  address: string
  amount: number
}
