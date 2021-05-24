import { ApiClient, RpcApiError } from '../src'
import { DeFiDContainer } from '@defichain/testcontainers'
import { JellyfishJSON, Precision, PrecisionPath } from '@defichain/jellyfish-json'

/**
 * Jellyfish client adapter for container
 * To be used for testing api-core protocol data binding only
 */
export class ContainerAdapterClient extends ApiClient {
  protected readonly container: DeFiDContainer

  constructor (container: DeFiDContainer) {
    super()
    this.container = container
  }

  /**
   * Wrap the call from client to testcontainers.
   */
  async call<T> (method: string, params: any[], precision: Precision | PrecisionPath): Promise<T> {
    const body = JellyfishJSON.stringify({
      jsonrpc: '1.0',
      id: Math.floor(Math.random() * 100000000000000),
      method: method,
      params: params
    })

    const text = await this.container.post(body)
    const { result, error } = JellyfishJSON.parse(text, {
      result: precision
    })

    if (error != null) {
      throw new RpcApiError({ ...error, rpcMethod: method })
    }

    return result
  }
}
