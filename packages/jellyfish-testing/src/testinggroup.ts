import { TestingGroupAnchor } from './anchor'
import { ContainerGroup, MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { MasterNodeKey, RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { Testing, TestingLight } from './testing'

export abstract class TestingGroupBase<T extends (Testing | TestingLight)> {
  public abstract readonly group: ContainerGroup
  public abstract readonly testings: T[]

  get (index: number): T {
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

  async link (): Promise<void> {
    return await this.group.link()
  }

  async exec (runner: (testing: T) => Promise<void>): Promise<void> {
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

export class TestingGroup extends TestingGroupBase<Testing> {
  public readonly anchor = new TestingGroupAnchor(this)

  private constructor (
    public readonly group: ContainerGroup,
    public readonly testings: Testing[]
  ) {
    super()
  }

  /**
   * Create a container group with `n` number of `Testing` containers.
   *
   * An init handler method can be provided to provide specially configured master
   * node instances to the container group.
   *
   * @param {number} n - Number of testing containers to create
   * @param {(index: number) => MasterNodeRegTestContainer} [init=MasterNodeRegTestContainer]
   */
  static create (
    n: number,
    init = (index: number) => new MasterNodeRegTestContainer(RegTestFoundationKeys[index])
  ): TestingGroup {
    const containers: MasterNodeRegTestContainer[] = []
    const testings: Testing[] = []
    for (let i = 0; i < n; i += 1) {
      const container = init(i)
      containers.push(container)

      const testing = Testing.create(container)
      testings.push(testing)
    }

    const group = new ContainerGroup(containers)
    return new TestingGroup(group, testings)
  }

  async add (container: MasterNodeRegTestContainer): Promise<void> {
    await this.group.add(container)
    const testing = Testing.create(container)
    this.testings.push(testing)
  }
}

export class TestingLightGroup extends TestingGroupBase<TestingLight> {
  private constructor (
    public readonly group: ContainerGroup,
    public readonly master: Testing,
    public readonly testings: TestingLight[]
  ) {
    super()
  }

  /**
   * Create a container group with `n` number of `TestingLight` containers.
   *
   * @param {number} n - Number of light containers to create
   * @param {MasterNodeKey} masterNodeKey - Master key to assign to master node container
   *
   * @returns testing group instance for light nodes
   */
  static create (
    n: number,
    masterNodeKey: MasterNodeKey = RegTestFoundationKeys[0]
  ): TestingLightGroup {
    const master = Testing.create(new MasterNodeRegTestContainer(masterNodeKey))

    const containers: Array<MasterNodeRegTestContainer | RegTestContainer> = [master.container]
    const testings: TestingLight[] = []
    for (let i = 0; i < n; i += 1) {
      const container = new RegTestContainer()
      containers.push(container)

      const testing = TestingLight.create(container, master)
      testings.push(testing)
    }

    const group = new ContainerGroup(containers)
    return new TestingLightGroup(group, master, testings)
  }

  async add (container: RegTestContainer): Promise<void> {
    await this.group.add(container)
    const testing = TestingLight.create(container, this.master)
    this.testings.push(testing)
  }
}
