import fetch from 'cross-fetch'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { TestingPoolPair } from '@defichain/jellyfish-testing/poolpair'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TestingRawTx } from '@defichain/jellyfish-testing/rawtx'
import { TestingToken } from '@defichain/jellyfish-testing/token'
import { TestingFixture } from '@defichain/jellyfish-testing/fixture'

export * from './fixture'
export * from './poolpair'
export * from './rawtx'
export * from './token'

export class Testing {
  public readonly fixture = new TestingFixture(this)
  public readonly token = new TestingToken(this.container, this.rpc)
  public readonly poolpair = new TestingPoolPair(this.container, this.rpc)
  public readonly rawtx = new TestingRawTx(this.container, this.rpc)

  private readonly addresses: Record<string, string> = {}

  private constructor (
    public readonly container: MasterNodeRegTestContainer,
    public readonly rpc: TestingJsonRpcClient
  ) {
  }

  async generate (n: number): Promise<void> {
    await this.container.generate(n)
  }

  async address (key: number | string): Promise<string> {
    key = key.toString()
    if (this.addresses[key] === undefined) {
      this.addresses[key] = await this.container.getNewAddress()
    }
    return this.addresses[key]
  }

  static create (container: MasterNodeRegTestContainer): Testing {
    const rpc = new TestingJsonRpcClient(container)
    return new Testing(container, rpc)
  }
}

/**
 * JsonRpcClient with dynamic url resolved from MasterNodeRegTestContainer.
 */
class TestingJsonRpcClient extends JsonRpcClient {
  constructor (public readonly container: MasterNodeRegTestContainer) {
    super('resolved in fetch')
  }

  protected async fetch (body: string, controller: any): Promise<Response> {
    const url = await this.container.getCachedRpcUrl()
    return await fetch(url, {
      method: 'POST',
      body: body,
      cache: 'no-cache',
      headers: this.options.headers,
      signal: controller.signal
    })
  }
}
