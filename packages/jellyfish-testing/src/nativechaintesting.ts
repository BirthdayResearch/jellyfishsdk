import fetch from 'cross-fetch'
import { Network, StartedNetwork } from 'testcontainers'
import { TestingFixture } from './fixture'
import { TestingToken } from './token'
import { TestingPoolPair } from './poolpair'
import { TestingRawTx } from './rawtx'
import { TestingICX } from './icxorderbook'
import { TestingMisc } from './misc'
import { TestingGroupAnchor } from './anchor'
import {
  ContainerGroup,
  NativeChainContainer,
  StartedNativeChainContainer,
  StartOptions
} from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'

export class NativeChainTesting {
  public readonly fixture = new TestingFixture(this)
  public readonly token = new TestingToken(this.container, this.rpc)
  public readonly poolpair = new TestingPoolPair(this.container, this.rpc)
  public readonly rawtx = new TestingRawTx(this.container, this.rpc)
  public readonly icxorderbook = new TestingICX(this)
  public readonly misc = new TestingMisc(this.container, this.rpc)

  private readonly addresses: Record<string, string> = {}

  private constructor (
    public readonly container: StartedNativeChainContainer,
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

  static create (container: StartedNativeChainContainer): NativeChainTesting {
    const rpc = new TestingJsonRpcClient(container)
    return new NativeChainTesting(container, rpc)
  }
}

export class NativeChainTestingGroup {
  public readonly anchor = new TestingGroupAnchor(this)

  private constructor (
    public readonly group: ContainerGroup,
    public readonly testings: NativeChainTesting[]
  ) {
  }

  /**
   * @param {number} n of testing container to create
   * @param {(index: number) => MasterNodeRegTestContainer} [init=MasterNodeRegTestContainer]
   */
  static async create (
    n: number,
    init = async (startedNetwork: StartedNetwork, index: number) => await new NativeChainContainer()
      .withNetworkMode((startedNetwork).getName())
      .withPreconfiguredRegtestMasternode(RegTestFoundationKeys[index])
      .withStartupTimeout(180_000)
      .start()
  ): Promise<NativeChainTestingGroup> {
    const containers: StartedNativeChainContainer[] = []
    const testings: NativeChainTesting[] = []

    const startedNetwork = await new Network().start()
    for (let i = 0; i < n; i += 1) {
      const container = init(startedNetwork, i)
      containers.push(await container)

      const testing = NativeChainTesting.create(await container)
      testings.push(testing)
    }

    const group = new ContainerGroup(containers)
    return new NativeChainTestingGroup(group, testings)
  }

  get (index: number): NativeChainTesting {
    return this.testings[index]
  }

  length (): number {
    return this.testings.length
  }

  async add (container: StartedNativeChainContainer): Promise<void> {
    await this.group.add(container)
    const testing = NativeChainTesting.create(container)
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

  async exec (runner: (testing: NativeChainTesting) => Promise<void>): Promise<void> {
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
  constructor (public readonly container: StartedNativeChainContainer) {
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
