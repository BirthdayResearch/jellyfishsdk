import { StartedNetwork } from 'testcontainers'
import { v4 as uuidv4 } from 'uuid'
import { waitForCondition } from '../../utils'
import { NativeChainContainer, StartedNativeChainContainer } from '@defichain/testcontainers'
import { NetworkName } from '@defichain/jellyfish-network'

export class NativeChainContainerGroup {
  protected network?: StartedNetwork
  protected containers: StartedNativeChainContainer[] = []

  public constructor (
    protected readonly genericContainers: NativeChainContainer[] = [],
    protected readonly name = `testcontainers-${uuidv4()}`
  ) {
  }

  /**
   * @param {number} index of masternode in group
   * @return {StartedNativeChainContainer}
   */
  get (index: number): StartedNativeChainContainer {
    return this.containers[index]
  }

  list (): StartedNativeChainContainer[] {
    return this.containers
  }

  async start (
    blockchainNetwork: NetworkName = 'regtest' // ensures the group are in the same blockchainNetwork (i.e. mainnet shouldn't communicate with regtest)
  ): Promise<this> {
    for (const container of this.genericContainers.splice(0)) {
      await this.add(await container // caller should have already defined the fluent props
        .withBlockchainNetwork(blockchainNetwork)
        .start())
    }
    return this
  }

  // I think `discover()` is a better name to replace `link()`.
  async discover (): Promise<void> {
    const promises: Array<Promise<void>> = []
    for (const container of this.containers) {
      promises.push(this.add(container))
    }
    await Promise.all(promises)
  }

  // [DEPRECATED] Please call `discover()` instead.
  async link (): Promise<void> {
    await this.discover()
  }

  /**
   * Require network, else error exceptionally.
   * Not a clean design, but it keep the complexity of this implementation low.
   */
  protected requireNetwork (): StartedNetwork {
    if (this.network !== undefined) {
      return this.network
    }
    throw new Error('network not yet started')
  }

  /**
   * @param startedContainer
   */
  async add (startedContainer: StartedNativeChainContainer): Promise<void> {
    for (const each of this.containers) {
      const networkNames = each.getNetworkNames()
      for (const name of networkNames) {
        await startedContainer.addNode(each.getIpAddress(name))
      }
    }

    this.containers.push(startedContainer)
  }

  /**
   * Wait for all container to receive the same txid in mempool
   *
   * @param {string} txid to wait for in mempool
   * @param {number} [timeout=20000] in millis
   */
  async waitForMempoolSync (txid: string, timeout: number = 20000): Promise<void> {
    await waitForCondition(async () => {
      const txns = await Promise.all(Object.values(this.containers).map(async container => {
        return await container.call('getrawtransaction', [txid, false])
      }))

      return txns.every(value => value === txns[0])
    }, timeout, 200, 'waitForMempoolSync')
  }

  /**
   * Wait for all container to sync up
   * @param {number} [timeout=20000] in millis
   */
  async waitForSync (timeout: number = 20000): Promise<void> {
    await waitForCondition(async () => {
      const hashes = await Promise.all(Object.values(this.containers).map(async container => {
        return await container.getBestBlockHash()
      }))

      return hashes.every(value => value === hashes[0])
    }, timeout, 200, 'waitForSync')
  }

  /**
   * Stop container group and all containers associated with it
   */
  async stop (): Promise<this> {
    for (const container of this.containers) {
      await container.stop()
    }

    await this.requireNetwork().stop()
    return this
  }
}
