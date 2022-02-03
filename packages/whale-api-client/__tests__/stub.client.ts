import { Method, ResponseAsString, WhaleApiClient, WhaleRpcClient } from '../src'
import { StubService } from './stub.service'
import version from '../src/version'
import AbortController from 'abort-controller'

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

export class StubWhaleRpcClient extends WhaleRpcClient {
  constructor (readonly service: StubService) {
    super('not required for stub service')
  }

  protected async fetch (body: string, controller: AbortController): Promise<Response> {
    if (this.service.app === undefined) {
      throw new Error('StubService is not yet started.')
    }

    const res = await this.service.app.inject({
      method: 'POST',
      url: `/${version}/regtest/rpc`,
      payload: body,
      headers: { 'Content-Type': 'application/json' }
    })

    // @ts-expect-error
    return {
      url: res.raw.req.url,
      ok: res.statusCode === 200,
      redirected: false,
      status: res.statusCode,
      statusText: res.statusMessage,
      bodyUsed: true,
      async text (): Promise<string> {
        return res.body
      }
    }
  }
}
