import { JellyfishJSON, Precision, PrecisionPath } from '@defichain/jellyfish-api-core'
import { raiseIfError } from '../errors'
import { WhaleApiClient } from '../WhaleApiClient'
import { WhaleApiResponse } from '../WhaleApiResponse'

/**
 * @deprecated since 0.22.x, please use WhaleRpcClient directly
 */
export class Rpc {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * @param {string} method of the RPC method
   * @param {any[]} params to send upstream
   * @param {Precision | PrecisionPath} precision for JSON parsing
   * @throws WhaleApiException instanceof for upstream errors
   * @throws WhaleClientException instanceof for local issues
   * @returns {Promise<T>}
   */
  async call<T> (method: string, params: any[], precision: Precision | PrecisionPath): Promise<T> {
    const body = JellyfishJSON.stringify({ params: params })
    const responseRaw = await this.client.requestAsString('POST', `rpc/${method}`, body)
    const response: WhaleApiResponse<T> = JellyfishJSON.parse(responseRaw.body, precision)
    raiseIfError(response)
    return response.data
  }
}
