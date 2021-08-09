import { TestingPoolPair } from "@defichain/jellyfish-testing/poolpair";
import { MasterNodeRegTestContainer } from "@defichain/testcontainers";
import { JsonRpcClient } from "@defichain/jellyfish-api-jsonrpc";
import { TestingRawTx } from "@defichain/jellyfish-testing/rawtx";
import { TestingToken } from "@defichain/jellyfish-testing/token";

export * from './poolpair'
export * from './rawtx'
export * from './token'

interface TestingOptions {
  autoGenerate?: boolean
}

export class Testing {
  public readonly token = new TestingToken(this.container, this.autoGenerateRpc)
  public readonly poolpair = new TestingPoolPair(this.container, this.autoGenerateRpc)
  public readonly rawtx = new TestingRawTx(this.container, this.autoGenerateRpc)

  public readonly addresses: Record<string, string> = {}

  private constructor (
    public readonly container: MasterNodeRegTestContainer,
    public readonly rpc: TestingJsonRpcClient,
    private readonly autoGenerateRpc: AutoGenerateRpcClient
  ) {
  }

  async generate (n: number): Promise<void> {
    await this.container.generate(n)
  }

  async address (key: number | string): Promise<string> {
    key = key.toString()
    if (!this.addresses[key]) {
      this.addresses[key] = await this.container.getNewAddress()
    }
    return this.addresses[key]
  }

  static create (container: MasterNodeRegTestContainer, options: TestingOptions = {}) {
    const rpc = new TestingJsonRpcClient(container)
    const autoGenerateRpc = new AutoGenerateRpcClient(container, options.autoGenerate ?? true)
    return new Testing(container, rpc, autoGenerateRpc)
  }
}

/**
 * JsonRpcClient with dynamic url resolved from MasterNodeRegTestContainer.
 */
class TestingJsonRpcClient extends JsonRpcClient {
  constructor (public readonly container: MasterNodeRegTestContainer) {
    super('resolved in fetch');
  }

  protected async fetch (body: string, controller: any): Promise<Response> {
    const url = await this.container.getCachedRpcUrl()
    return fetch(url, {
      method: 'POST',
      body: body,
      cache: 'no-cache',
      headers: this.options.headers,
      signal: controller.signal
    })
  }
}

/**
 * JsonRpcClient with auto generate(1) after every fetch call
 */
class AutoGenerateRpcClient extends TestingJsonRpcClient {
  constructor (
    public readonly container: MasterNodeRegTestContainer,
    public readonly autoGenerate: boolean
  ) {
    super(container);
  }

  protected async fetch (body: string, controller: any): Promise<Response> {
    const res = await super.fetch(body, controller)
    if (this.autoGenerate) {
      await this.container.generate(1)
    }
    return res
  }
}
