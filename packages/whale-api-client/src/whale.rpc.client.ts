import { ApiClient, Precision, PrecisionPath } from '@defichain/jellyfish-api-core'
import { WhaleApiClient } from './whale.api.client'
import { Wallet } from '@defichain/jellyfish-api-core/dist/category/wallet'
import { Net } from '@defichain/jellyfish-api-core/dist/category/net'

/**
 * A JSON-RPC client implemented with WhaleApiClient.call specification.
 * Not all methods are whitelisted.
 */
export class WhaleRpcClient extends ApiClient {
  wallet = NotEnabledProxy<Wallet>('wallet')
  net = NotEnabledProxy<Net>('net')

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
    return await this.whaleApiClient.rpc.call(method, params, precision)
  }
}

function NotEnabledProxy<T> (category: string): T {
  return new Proxy({}, {
    get (target, prop) {
      throw new Error(`WhaleRpcClient: ${category}.${prop as string} not enabled in WhaleApiClient`)
    }
  }) as T
}
