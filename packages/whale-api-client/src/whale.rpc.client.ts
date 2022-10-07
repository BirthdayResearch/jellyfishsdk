import { ClientOptions, JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

/**
 * A JSON-RPC client implemented to interface with Whale RpcController.
 *
 * Not all methods are whitelisted.
 */
export class WhaleRpcClient extends JsonRpcClient {
  /**
   * MainNet Stable: https://ocean.defichain.com/v0/mainnet/rpc
   * MainNet Edge:   https://ocean.defichain.com/v0.x/mainnet/rpc
   *
   * @param {string} url
   * @param {ClientOptions} [options]
   */
  constructor (url: string = 'https://ocean.defichain.com/v0/mainnet/rpc', options?: ClientOptions) {
    super(url, {
      ...options,
      headers: {
        ...options?.headers,
        'Content-Type': 'application/json'
      }
    })
  }
}
