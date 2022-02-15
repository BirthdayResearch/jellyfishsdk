import { JellyfishJSON, Precision, PrecisionPath } from '@defichain/jellyfish-api-core'
import { PlaygroundApiClient } from '../playground.api.client'
import { PlaygroundApiResponse } from '../playground.api.response'
import { raiseIfError } from '../errors'

export class Rpc {
  constructor (private readonly client: PlaygroundApiClient) {
  }

  /**
   * @param {string} method the RPC method
   * @param {any[]} params to send upstream
   * @param {Precision | PrecisionPath} precision for JSON parsing
   * @throws PlaygroundApiException instanceof for upstream errors
   * @throws PlaygroundClientException instanceof for local issues
   */
  async call<T> (method: string, params: any[], precision: Precision | PrecisionPath): Promise<T> {
    const body = JellyfishJSON.stringify({ params: params })
    const responseRaw = await this.client.requestAsString('POST', `rpc/${method}`, body)
    const response: PlaygroundApiResponse<T> = JellyfishJSON.parse(responseRaw.body, precision)
    raiseIfError(response)
    return response.data
  }
}
