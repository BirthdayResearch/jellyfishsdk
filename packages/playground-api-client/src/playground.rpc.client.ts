import { ApiClient, Precision, PrecisionPath } from '@defichain/jellyfish-api-core'
import { PlaygroundApiClient } from './playground.api.client'

/**
 * A JSON-RPC client implemented with PlaygroundApiClient.call specification.
 * Not all methods are whitelisted.
 */
export class PlaygroundRpcClient extends ApiClient {
  constructor (protected readonly playgroundApiClient: PlaygroundApiClient) {
    super()
  }

  /**
   * Implements jellyfish-api-core ApiClient by routing to PlaygroundApiClient.call
   *
   * @param {string} method the RPC method
   * @param {any[]} params to send upstream
   * @param {Precision | PrecisionPath} precision for JSON parsing
   * @throws PlaygroundApiException instanceof for upstream errors
   * @throws PlaygroundClientException instanceof for local issues
   */
  async call<T> (method: string, params: any[], precision: Precision | PrecisionPath): Promise<T> {
    return await this.playgroundApiClient.rpc.call(method, params, precision)
  }
}
