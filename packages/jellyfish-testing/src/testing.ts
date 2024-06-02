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

export class NonMNTesting {
  private readonly addresses: Record<string, string> = {}

  private constructor (
    public readonly container: RegTestContainer,
    public readonly rpc: TestingJsonRpcClient
  ) {
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

  static create (container: RegTestContainer): NonMNTesting {
    const rpc = new TestingJsonRpcClient(container)
    return new NonMNTesting(container, rpc)
  }
}

type InitRegContainerFn = (index: number) => RegTestContainer
export class TestingGroup {
  public readonly anchor = new TestingGroupAnchor(this)

  private constructor (
    public readonly group: ContainerGroup,
    public readonly testings: Testing[],
    public readonly nonMNTestings: NonMNTesting[]
  ) {
  }

  /**
   * @param {number} n of testing container to create
   * @param {(index: number) => MasterNodeRegTestContainer} [init=MasterNodeRegTestContainer]
   */
  static create (
    n: number,
    init: InitRegContainerFn = (index: number) => new MasterNodeRegTestContainer(RegTestFoundationKeys[index])
  ): TestingGroup {
    const containers: RegTestContainer[] = []
    const testings: Testing[] = []
    const nonMNTestings: NonMNTesting[] = []
    for (let i = 0; i < n; i += 1) {
      const container = init(i)
      containers.push(container)

      if (container instanceof MasterNodeRegTestContainer) {
        const testing = Testing.create(container)
        testings.push(testing)
      } else {
        const nonMNTesting = NonMNTesting.create(container)
        nonMNTestings.push(nonMNTesting)
      }
    }

    const group = new ContainerGroup(containers)
    return new TestingGroup(group, testings, nonMNTestings)
  }

  static createFrom (group: ContainerGroup, testings: Testing[], nonMNTestings: NonMNTesting[]): TestingGroup {
    return new TestingGroup(group, testings, nonMNTestings)
  }

  get (index: number): Testing {
    return this.testings[index]
  }

  getNonMN (index: number): NonMNTesting {
    return this.nonMNTestings[index]
  }

  length (): number {
    return this.testings.length
  }

  nonMNLength (): number {
    return this.nonMNTestings.length
  }

  async add (container: MasterNodeRegTestContainer): Promise<void> {
    await this.group.add(container)
    const testing = Testing.create(container)
    this.testings.push(testing)
  }

  async addNonMN (container: RegTestContainer): Promise<void> {
    await this.group.add(container)
    const nonMNtesting = NonMNTesting.create(container)
    this.nonMNTestings.push(nonMNtesting)
  }

  async addTesting (testing: Testing): Promise<void> {
    await this.group.add(testing.container)
    this.testings.push(testing)
  }

  async addNonMNTesting (testing: NonMNTesting): Promise<void> {
    await this.group.add(testing.container)
    this.nonMNTestings.push(testing)
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

  async execNonMN (runner: (testing: NonMNTesting) => Promise<void>): Promise<void> {
    for (let i = 0; i < this.nonMNTestings.length; i += 1) {
      await runner(this.nonMNTestings[i])
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
 * JsonRpcClient with dynamic url resolved from RegTestContainer.
 */
class TestingJsonRpcClient extends JsonRpcClient {
  constructor (public readonly container: RegTestContainer) {
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
