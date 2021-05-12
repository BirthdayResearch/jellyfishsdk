import { ApiClient, Precision, PrecisionPath } from '@defichain/jellyfish-api-core'
import { WhaleApiClient } from './whale.api.client'
import { Wallet } from '@defichain/jellyfish-api-core/dist/category/wallet'

/**
 * A JSON-RPC client implemented with WhaleApiClient.call specification.
 * Not all methods are whitelisted.
 */
export class WhaleRpcClient extends ApiClient {
  // @ts-expect-error
  get wallet (): Wallet {
    throw new Error('wallet RPCs are not enabled in whale client')
  }

  // @ts-expect-error
  get net (): Wallet {
    throw new Error('net RPCs are not enabled in whale client')
  }

  constructor (protected readonly whaleApiClient: WhaleApiClient) {
    super()
  }

  /**
   * Implements jellyfish-api-core ApiClient by routing to WhaleApiClient.call
   *
   * @param {string} method the RPC method
   * @param {any[]} params to send upstream
   * @param {Precision | PrecisionPath} precision for JSON parsing
   * @throws WhaleApiException instanceof for upstream errors
   * @throws WhaleClientException instanceof for local issues
   */
  async call<T> (method: string, params: any[], precision: Precision | PrecisionPath): Promise<T> {
    return await this.whaleApiClient.call.call(method, params, precision)
  }
}
