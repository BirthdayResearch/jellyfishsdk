import { ApiClient, Precision, PrecisionPath } from '@defichain/jellyfish-api-core'
import { WhaleRpcClient } from '@defichain/whale-api-client'

export class LocalWhaleRpcClient extends WhaleRpcClient {
  constructor (private readonly apiClient: ApiClient) {
    super('no url needed')
  }

  async call<T> (method: string, params: any[], precision: Precision | PrecisionPath): Promise<T> {
    return await this.apiClient.call(method, params, precision)
  }
}
