import { Method, ResponseAsString, PlaygroundApiClient } from '../src'
import { StubService } from './stub.service'

/**
 * Client stubs are simulations of a real client, which are used for functional testing.
 * StubPlaygroundApiClient simulate a real PlaygroundApiClient connected to a DeFi Playground Service.
 */
export class StubPlaygroundApiClient extends PlaygroundApiClient {
  constructor (readonly service: StubService) {
    super({ url: 'not required for stub service' })
  }

  async requestAsString (method: Method, path: string, body?: string): Promise<ResponseAsString> {
    if (this.service.app === undefined) {
      throw new Error('StubService is not yet started.')
    }

    const res = await this.service.app.inject({
      method: method,
      url: `/v0/playground/${path}`,
      payload: body,
      headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {}
    })

    return {
      body: res.body,
      status: res.statusCode
    }
  }
}
