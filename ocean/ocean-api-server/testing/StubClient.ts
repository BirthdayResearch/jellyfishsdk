import { OceanApiClient, ResponseAsString } from '@defichain/ocean-api-client'
import { ApiMethod } from '@defichain/ocean-api-core'
import { StubServer } from './StubServer'
import { ConfigService } from '@nestjs/config'

/**
 * Client stubs are simulations of a real client, which are used for functional testing.
 * StubWhaleApiClient simulate a real WhaleApiClient connected to a DeFi Whale Service.
 */
export class StubClient extends OceanApiClient {
  constructor (readonly service: StubServer) {
    super({ url: 'not required for stub service' })
  }

  async requestAsString (method: ApiMethod, path: string, body?: string): Promise<ResponseAsString> {
    if (this.service.app === undefined) {
      throw new Error('StubService is not yet started.')
    }

    const version = this.service.app.get(ConfigService).get('API_VERSION') as string
    const network = this.service.app.get(ConfigService).get('API_NETWORK') as string

    const res = await this.service.app.inject({
      method: method,
      url: `/${version}/${network}/${path}`,
      payload: body,
      headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {}
    })

    return {
      body: res.body,
      status: res.statusCode
    }
  }
}
