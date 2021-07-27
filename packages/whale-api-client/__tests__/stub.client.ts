import { Method, ResponseAsString, WhaleApiClient } from '../src'
import { StubService } from './stub.service'

/**
 * Client stubs are simulations of a real client, which are used for functional testing.
 * StubWhaleApiClient simulate a real WhaleApiClient connected to a DeFi Whale Service.
 */
export class StubWhaleApiClient extends WhaleApiClient {
  constructor (readonly service: StubService) {
    super({ url: 'not required for stub service' })
  }

  async requestAsString (method: Method, path: string, body?: string): Promise<ResponseAsString> {
    if (this.service.app === undefined) {
      throw new Error('StubService is not yet started.')
    }

    const version = this.options.version as string
    const res = await this.service.app.inject({
      method: method,
      url: `/${version}/regtest/${path}`,
      payload: body,
      headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {}
    })

    return {
      body: res.body,
      status: res.statusCode
    }
  }
}
