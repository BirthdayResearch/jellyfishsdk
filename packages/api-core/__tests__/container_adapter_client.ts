import { JellyfishJSON, JellyfishClient, Precision, JellyfishRPCError } from '../src'
import { DeFiDContainer } from '@defichain/testcontainers'

/**
 * Jellyfish client adapter for container
 * To be used for testing api-core protocol data binding only
 */
export class ContainerAdapterClient extends JellyfishClient {
  protected readonly container: DeFiDContainer

  constructor (container: DeFiDContainer) {
    super()
    this.container = container
  }

  /**
   * Wrap the call from client to testcontainers.
   */
  async call<T> (method: string, params: any[], precision: Precision): Promise<T> {
    const body = JellyfishJSON.stringify({
      jsonrpc: '1.0',
      id: Math.floor(Math.random() * 100000000000000),
      method: method,
      params: params
    })

    const text = await this.container.post(body)
    const response = JellyfishJSON.parse(text, precision)

    const { result, error } = response

    if (error !== undefined && error !== null) {
      throw new JellyfishRPCError(error)
    }

    return result
  }
}
