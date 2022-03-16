import { WhaleApiClient, ResponseAsString } from '@defichain/whale-api-client'
import { WhaleStubServer } from './WhaleStubServer'
import { ConfigService } from '@nestjs/config'

// temp: will move to whale-api-client
export type ApiMethod = 'POST' | 'GET'

/**
 * Client stubs are simulations of a real client, which are used for functional testing.
 * StubClient simulate a real WhaleApiClient connected to an Whale API.
 */
export class WhaleStubClient extends WhaleApiClient {
  constructor (readonly service: WhaleStubServer) {
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
