import { Method, RawResponse, WhaleApiClient } from '../src'
import { StubService } from './stub.service'

/**
 * Client stubs are simulations of a real client, which are used for functional testing.
 * StubWhaleApiClient simulate a real WhaleApiClient connected to a DeFi Whale Service.
 */
export class StubWhaleApiClient extends WhaleApiClient {
  constructor (readonly service: StubService) {
    super({ url: 'not required' })
  }

  protected async _fetch (method: Method, path: string, body: string, controller: AbortController): Promise<RawResponse> {
    if (this.service.app === undefined) {
      throw new Error('StubService is not yet started.')
    }

    const res = await this.service.app.inject({
      method: 'POST',
      url: `/v1/regtest/${path}`,
      payload: body,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return {
      body: res.body,
      status: res.statusCode
    }
  }
}
