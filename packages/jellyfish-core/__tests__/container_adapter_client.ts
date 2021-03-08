import { JellyfishClient, JellyfishError } from '../src/core'
import { DeFiDContainer } from '@defichain/testcontainers'

/**
 * Jellyfish client adapter for container
 * To be used for testing jellyfish-core protocol data binding only
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
  async call<T> (method: string, params: any[]): Promise<T> {
    const body = JSON.stringify({
      jsonrpc: '1.0',
      id: Math.floor(Math.random() * 100000000000000),
      method: method,
      params: params
    })

    const text = await this.container.post(body)
    const response = JSON.parse(text)

    const { result, error } = response

    if (error !== null) {
      throw new JellyfishError(error)
    }

    return result
  }
}
