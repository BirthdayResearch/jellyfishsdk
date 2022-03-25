import { Response } from 'cross-fetch'
import { ApiClient, Precision, PrecisionPath } from '@defichain/jellyfish-api-core'
import { WhaleRpcClient } from '@defichain/whale-api-client'
import AbortController from 'abort-controller'

export class LocalWhaleRpcClient extends WhaleRpcClient {
  constructor (private readonly apiClient: ApiClient) {
    super('no url needed')
  }

  async call<T> (method: string, params: any[], precision: Precision | PrecisionPath): Promise<T> {
    return await this.apiClient.call(method, params, precision)
  }

  protected async fetch (body: string, controller: AbortController): Promise<Response> {
    return await Promise.resolve(new Response())
  }
}
