import { JellyfishClient, JellyfishError } from '../../src/core'
import { DeFiDContainer } from '@defichain/testcontainers'

/**
 * Jellyfish client adapter for container
 * Used for testing jellyfish-core only
 */
export class ContainerAdapterClient extends JellyfishClient {
  protected readonly container: DeFiDContainer

  constructor (container: DeFiDContainer) {
    super()
    this.container = container
  }

  /**
   * Wrap the call from client to testcontainers.
   * Errors are surfaced and adapted as well
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
    console.log(response)

    const { result, error } = response

    if (error !== null) {
      throw new JellyfishError(error)
    }

    // TODO(fuxingloh): map error structure

    return result
  }
}
