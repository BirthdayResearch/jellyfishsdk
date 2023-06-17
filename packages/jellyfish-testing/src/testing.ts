import fetch from 'cross-fetch'
import { TestingFixture } from './fixture'
import { TestingToken } from './token'
import { TestingPoolPair } from './poolpair'
import { TestingRawTx } from './rawtx'
import { TestingICX } from './icxorderbook'
import { TestingMisc } from './misc'
import { TestingGroupAnchor } from './anchor'
import { ContainerGroup, MasterNodeRegTestContainer, RegTestContainer, StartOptions } from '@defichain/testcontainers'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

export type TestingContainer = MasterNodeRegTestContainer | RegTestContainer
export type TestingGroupInit<Container> = (index: number) => Container

export class Testing<Container extends TestingContainer = MasterNodeRegTestContainer> {
  readonly fixture: TestingFixture
  readonly icxorderbook: TestingICX
  readonly token: TestingToken
  readonly poolpair: TestingPoolPair
  readonly rawtx: TestingRawTx
  readonly misc: TestingMisc

  private readonly addresses: Record<string, string> = {}

  private constructor (
    public readonly container: Container,
    public readonly rpc: TestingJsonRpcClient<Container>
  ) {
    this.fixture = new TestingFixture(this as Testing<MasterNodeRegTestContainer>)
    this.icxorderbook = new TestingICX(this as Testing<MasterNodeRegTestContainer>)
    this.token = new TestingToken(this.container as MasterNodeRegTestContainer, this.rpc)
    this.poolpair = new TestingPoolPair(this.container as MasterNodeRegTestContainer, this.rpc)
    this.rawtx = new TestingRawTx(this.container as MasterNodeRegTestContainer, this.rpc)
    this.misc = new TestingMisc(this.container as MasterNodeRegTestContainer, this.rpc)
  }

  async generate (n: number): Promise<void> {
    await (this.container as MasterNodeRegTestContainer).generate(n)
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

  static create<Container extends TestingContainer> (container: Container): Testing<Container> {
    const rpc = new TestingJsonRpcClient(container)
    return new Testing<Container>(container, rpc)
  }
}

export class TestingGroup<Container extends TestingContainer = MasterNodeRegTestContainer> {
  readonly anchor: TestingGroupAnchor

  private constructor (
    public readonly group: ContainerGroup,
    public readonly testings: Array<Testing<Container>>
  ) {
    this.anchor = new TestingGroupAnchor(this as TestingGroup<MasterNodeRegTestContainer>)
  }

  /**
   * @param {number} n of testing container to create
   * @param {(index: number) => MasterNodeRegTestContainer} [init=MasterNodeRegTestContainer]
   */
  static create<Container extends TestingContainer = MasterNodeRegTestContainer> (
    n: number,
    init: TestingGroupInit<Container> = (index: number): Container => {
      return new MasterNodeRegTestContainer(RegTestFoundationKeys[index]) as Container
    }
  ): TestingGroup<Container> {
    const containers: Container[] = []
    const testings: Array<Testing<Container>> = []
    for (let i = 0; i < n; i += 1) {
      const container = init(i)
      containers.push(container)

      const testing = Testing.create<Container>(container)
      testings.push(testing)
    }

    const group = new ContainerGroup(containers)
    return new TestingGroup<Container>(group, testings)
  }

  static createFrom (group: ContainerGroup, testings: Array<Testing<TestingContainer>>): TestingGroup<TestingContainer> {
    return new TestingGroup(group, testings)
  }

  get (index: number): Testing<Container> {
    return this.testings[index]
  }

  length (): number {
    return this.testings.length
  }

  async add (container: Container): Promise<void> {
    await this.group.add(container)

    const testing = Testing.create(container)
    this.testings.push(testing)
  }

  async addOther (container: TestingContainer): Promise<void> {
    // only add the container to the group. no testing will be stored since
    // it's not possible to store other type with already narrowed generic type.
    await this.group.add(container)
  }

  async start (opts?: StartOptions): Promise<void> {
    return await this.group.start(opts)
  }

  async stop (): Promise<void> {
    return await this.group.stop()
  }

  async link (): Promise<void> {
    return await this.group.link()
  }

  async exec (runner: (testing: Testing<Container>) => Promise<void>): Promise<void> {
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
class TestingJsonRpcClient<Container extends TestingContainer> extends JsonRpcClient {
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
