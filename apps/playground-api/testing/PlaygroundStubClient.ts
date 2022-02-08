import { ApiMethod, PlaygroundApiClient, ResponseAsString } from '@defichain/playground-api-client'
import { PlaygroundStubServer } from './PlaygroundStubServer'

/**
 * Client stubs are simulations of a real client, which are used for functional testing.
 * StubClient simulate a real PlaygroundApiClient connected to an Playground API.
 */
export class PlaygroundStubClient extends PlaygroundApiClient {
  constructor (readonly service: PlaygroundStubServer) {
    super({ url: 'not required for stub service' })
  }

  async requestAsString (method: ApiMethod, path: string, body?: string): Promise<ResponseAsString> {
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
