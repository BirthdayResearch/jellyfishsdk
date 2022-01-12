import fetch from 'cross-fetch'
import { TestingFixture } from './fixture'
import { TestingToken } from './token'
import { TestingPoolPair } from './poolpair'
import { TestingRawTx } from './rawtx'
import { TestingICX } from './icxorderbook'
import { TestingMisc } from './misc'
import { TestingGroupAnchor } from './anchor'
import { ContainerGroup, MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

export type TestingContainer = MasterNodeRegTestContainer | RegTestContainer
export type TestingGroupInit = (index: number) => MasterNodeRegTestContainer | RegTestContainer

export class Testing<Container extends TestingContainer> {
  public readonly fixture = new TestingFixture<Container>(this)
  public readonly token = new TestingToken<Container>(this.container, this.rpc)
  public readonly poolpair = new TestingPoolPair<Container>(this.container, this.rpc)
  public readonly rawtx = new TestingRawTx<Container>(this.container, this.rpc)
  public readonly icxorderbook = new TestingICX<Container>(this)
  public readonly misc = new TestingMisc<Container>(this.container, this.rpc)

  private readonly addresses: Record<string, string> = {}

  private constructor (
    public readonly container: Container,
    public readonly rpc: TestingJsonRpcClient<Container>
  ) {
  }

  async generate (n: number): Promise<void> {
    if (this.container instanceof MasterNodeRegTestContainer) {
      await this.container.generate(n)
    }
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

  static create<Container extends MasterNodeRegTestContainer | RegTestContainer> (container: Container): Testing<Container> {
    const rpc = new TestingJsonRpcClient(container)
    return new Testing<Container>(container, rpc)
  }
}

export class TestingGroup {
  public readonly anchor = new TestingGroupAnchor(this)

  private constructor (
    public readonly group: ContainerGroup,
    public readonly testings: Array<Testing<TestingContainer>>
  ) {
  }

  /**
   * @param {number} n of testing container to create
   * @param {(index: number) => MasterNodeRegTestContainer} [init=MasterNodeRegTestContainer]
   */
  static create (
    n: number,
    init: TestingGroupInit = (index: number): MasterNodeRegTestContainer => {
      return new MasterNodeRegTestContainer(RegTestFoundationKeys[index])
    }
  ): TestingGroup {
    const containers: TestingContainer[] = []
    const testings: Array<Testing<TestingContainer>> = []
    for (let i = 0; i < n; i += 1) {
      const container = init(i)
      containers.push(container)

      const testing = Testing.create(container)
      testings.push(testing)
    }

    const group = new ContainerGroup(containers)
    return new TestingGroup(group, testings)
  }

  get (index: number): Testing<TestingContainer> {
    return this.testings[index]
  }

  length (): number {
    return this.testings.length
  }

  async add (container: TestingContainer): Promise<void> {
    await this.group.add(container)
    const testing = Testing.create(container)
    this.testings.push(testing)
  }

  async start (): Promise<void> {
    return await this.group.start()
  }

  async stop (): Promise<void> {
    return await this.group.stop()
  }

  async link (): Promise<void> {
    return await this.group.link()
  }

  async exec (runner: (testing: Testing<TestingContainer>) => Promise<void>): Promise<void> {
    for (let i = 0; i < this.testings.length; i += 1) {
      await runner(this.testings[i])
    }
  }

  async waitForSync (): Promise<void> {
    return await this.group.waitForSync()
  }

  /* istanbul ignore next, TODO(canonbrother) */
  async waitForMempoolSync (txid: string, timeout = 15000): Promise<void> {
    return await this.group.waitForMempoolSync(txid, timeout)
  }
}

/**
 * JsonRpcClient with dynamic url resolved from MasterNodeRegTestContainer.
 */
class TestingJsonRpcClient<Container extends MasterNodeRegTestContainer | RegTestContainer> extends JsonRpcClient {
  constructor (public readonly container: Container) {
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
