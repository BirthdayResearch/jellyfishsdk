import fetch from 'cross-fetch'
import { TestingFixture } from './fixture'
import { TestingToken } from './token'
import { TestingPoolPair } from './poolpair'
import { TestingRawTx } from './rawtx'
import { TestingICX } from './icxorderbook'
import { TestingMisc } from './misc'
import { TestingGroupAnchor } from './anchor'
import { ContainerGroup, DeFiDContainer, MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

export class Testing<Container extends DeFiDContainer = DeFiDContainer> {
  public readonly fixture: TestingFixture
  public readonly icxorderbook: TestingICX

  public readonly token!: Container extends MasterNodeRegTestContainer ? TestingToken : undefined
  public readonly poolpair!: Container extends MasterNodeRegTestContainer ? TestingPoolPair : undefined
  public readonly rawtx!: Container extends MasterNodeRegTestContainer ? TestingRawTx : undefined
  public readonly misc!: Container extends MasterNodeRegTestContainer ? TestingMisc : undefined

  private readonly addresses: Record<string, string> = {}

  private constructor (
    public readonly container: Container,
    public readonly rpc: TestingJsonRpcClient
  ) {
    this.fixture = new TestingFixture(this)
    this.icxorderbook = new TestingICX(this)
    if (container instanceof MasterNodeRegTestContainer) {
      this.token = new TestingToken(container, this.rpc) as any
      this.poolpair = new TestingPoolPair(container, this.rpc) as any
      this.rawtx = new TestingRawTx(container, this.rpc) as any
      this.misc = new TestingMisc(container, this.rpc) as any
    }
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

  static create<Container extends DeFiDContainer> (container: Container): Testing<Container> {
    return this.createBase(container)
  }

  static createBase<Container extends DeFiDContainer> (container: Container = new DeFiDContainer('regtest') as Container): Testing<Container> {
    const rpc = new TestingJsonRpcClient(container)
    return new Testing(container, rpc)
  }
}

export class TestingGroup {
  public readonly anchor = new TestingGroupAnchor(this)

  constructor (
    public readonly group: ContainerGroup,
    public readonly testings: Testing[]
  ) {
  }

  /**
   * @param {number} n of testing container to create
   * @param {(index: number) => MasterNodeRegTestContainer} [init=MasterNodeRegTestContainer]
   */
  static create (
    n: number,
    init?: (index: number) => DeFiDContainer
  ): TestingGroup {
    const containers: MasterNodeRegTestContainer[] = []
    const testings: Testing[] = []

    if (init === undefined) {
      init = (index: number) => new MasterNodeRegTestContainer(RegTestFoundationKeys[index])
    }

    for (let i = 0; i < n; i += 1) {
      const container = init(i) as MasterNodeRegTestContainer
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

  async add (container: MasterNodeRegTestContainer): Promise<void> {
    await this.group.add(container)
    const testing = Testing.create(container)
    this.testings.push(testing)
  }

  async addTesting (testing: Testing): Promise<void> {
    await this.group.add(testing.container)
    this.testings.push(testing)
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

  async exec (runner: (testing: Testing) => Promise<void>): Promise<void> {
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
class TestingJsonRpcClient extends JsonRpcClient {
  constructor (public readonly container: DeFiDContainer) {
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
