import fetch from 'cross-fetch'
import { ContainerGroup, GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { TestingPoolPair } from './poolpair'
import { TestingRawTx } from './rawtx'
import { TestingToken } from './token'
import { TestingFixture } from './fixture'
import { TestingICX } from './icxorderbook'
import { TestingMisc } from './misc'

export * from './fixture'
export * from './poolpair'
export * from './rawtx'
export * from './token'
export * from './icxorderbook'
export * from './misc'

export class Testing {
  public readonly fixture = new TestingFixture(this)
  public readonly token = new TestingToken(this.container, this.rpc)
  public readonly poolpair = new TestingPoolPair(this.container, this.rpc)
  public readonly rawtx = new TestingRawTx(this.container, this.rpc)
  public readonly icxorderbook = new TestingICX(this)
  public readonly misc = new TestingMisc(this.container, this.rpc)

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
      this.addresses[key] = await this.generateAddress()
    }
    return this.addresses[key]
  }

  generateAddress (): Promise<string>
  generateAddress (n: 1): Promise<string>
  generateAddress (n: number): Promise<string[]>

  async generateAddress (n?: number): Promise<string | string[]> {
    if (n === undefined || n === 1) {
      return await this.container.getNewAddress()
    }

    const addresses: string[] = []
    for (let i = 0; i < n; i++) {
      addresses[i] = await this.container.getNewAddress()
    }
    return addresses
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

export class TestingGroup {
  private constructor (
    public readonly group: ContainerGroup,
    public readonly testings: Testing[]
  ) {
  }

  static create (n = 1): TestingGroup {
    const containers: MasterNodeRegTestContainer[] = []
    const testings: Testing[] = []
    for (let i = 0; i < n; i += 1) {
      const container = new MasterNodeRegTestContainer(GenesisKeys[i])
      containers.push(container)

      const testing = Testing.create(container)
      testings.push(testing)
    }
    const group = new ContainerGroup(containers)

    return new TestingGroup(group, testings)
  }

  get (index: number): Testing {
    return this.testings[index]
  }

  length (): number {
    return this.testings.length
  }

  async start (): Promise<void> {
    return await this.group.start()
  }

  async stop (): Promise<void> {
    return await this.group.stop()
  }

  async waitForSync (): Promise<void> {
    return await this.group.waitForSync()
  }

  async waitForMempoolSync (txid: string, timeout = 15000): Promise<void> {
    return await this.group.waitForMempoolSync(txid, timeout)
  }
}
