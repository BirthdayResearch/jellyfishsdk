import { ApiResponse, WhaleApiClient } from '../whale.api.client'
import { JellyfishJSON, Precision, PrecisionPath } from '@defichain/jellyfish-api-core'
import { raiseIfError } from '../errors'

export class Call {
  constructor (private readonly client: WhaleApiClient) {
  }

  /**
   * @param {string} method the RPC method
   * @param {any[]} params to send upstream
   * @param {Precision | PrecisionPath} precision for JSON parsing
   * @throws WhaleApiException instanceof for upstream errors
   * @throws WhaleClientException instanceof for local issues
   */
  async call<T> (method: string, params: any[], precision: Precision | PrecisionPath): Promise<T> {
    const body = JellyfishJSON.stringify({ params: params })
    const responseRaw = await this.client.requestRaw('POST', `call/${method}`, body)
    const response: ApiResponse<T> = JellyfishJSON.parse(responseRaw.body, precision)
    raiseIfError(response)
    return response.data
  }
}
