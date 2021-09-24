import Dockerode, { DockerOptions, Network } from 'dockerode'
import { waitForCondition } from '../../wait_for_condition'
import { MasterNodeRegTestContainer } from '../../chains/reg_test_container/masternode'

export class ContainerGroup {
  protected readonly docker: Dockerode
  protected network?: Network

  public constructor (
    protected readonly containers: MasterNodeRegTestContainer[] = [],
    protected readonly name = `testcontainers-${Math.floor(Math.random() * 10000000)}`,
    options?: DockerOptions
  ) {
    this.docker = new Dockerode(options)
  }

  /**
   * @param {number} index of masternode in group
   * @return {MasterNodeRegTestContainer} casted as MN convenience but it might be just a RegTestContainer
   */
  get (index: number): MasterNodeRegTestContainer {
    return this.containers[index]
  }

  async start (): Promise<void> {
    this.network = await new Promise((resolve, reject) => {
      return this.docker.createNetwork({
        Name: this.name,
        IPAM: {
          Driver: 'default',
          Config: []
        }
      }, (err, data) => {
        if (err instanceof Error) {
          return reject(err)
        }
        return data !== undefined
          ? resolve(data)
          : undefined
      })
    })

    // Removing all predefined containers and adding it to group
    for (const container of this.containers.splice(0)) {
      await container.start()
      await this.add(container)
    }
  }

  /**
   * Require network, else error exceptionally.
   * Not a clean design, but it keep the complexity of this implementation low.
   */
  protected requireNetwork (): Network {
    if (this.network !== undefined) {
      return this.network
    }
    throw new Error('network not yet started')
  }

  /**
   * @param {DeFiDContainer} container to add into container group with addnode
   */
  async add (container: MasterNodeRegTestContainer): Promise<void> {
    await this.requireNetwork().connect({ Container: container.id })

    for (const each of this.containers) {
      await container.addNode(await each.getIp(this.name))
    }

    this.containers.push(container)
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
      txns.forEach(txn => console.log('txn: ', txn, txns[0]))

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
   * Wait for anchor teams
   *
   * @param {number} nodesLength
   * @param {number} [timeout=30000] in ms
   * @return {Promise<void>}
   */
  async waitForAnchorTeams (nodesLength: number, timeout = 30000): Promise<void> {
    return await waitForCondition(async () => {
      for (let i = 0; i < 15; i += 1) { // 15 as anchor frequency
        const container = this.containers[i % this.containers.length]
        await container.generate(1)
        await this.waitForSync()
      }
      const teams = await Promise.all(Object.values(this.containers).map(async container => {
        return await container.call('getanchorteams')
      }))
      return teams.every(team => team.auth.length === nodesLength && team.confirm.length === nodesLength)
    }, timeout, 100, 'waitForAnchorTeams')
  }

  async waitForAnchorAuths (genAnchorAuthsCallback: () => Promise<void>, timeout = 30000): Promise<void> {
    return await waitForCondition(async () => {
      await genAnchorAuthsCallback()
      // check each container should be quorum ready
      const cAuths = await Promise.all(Object.values(this.containers).map(async container => {
        return await container.call('spv_listanchorauths')
      }))
      console.log('cAuths: ', cAuths, cAuths.forEach(auths => auths.forEach((auth: any) => console.log('signees: ', auth.signers, auth.signees))))
      return cAuths.every(auths => auths.every((auth: any) => auth.signers === this.containers.length))
    }, timeout, 100, 'waitForAnchorAuths')
  }

  /**
   * Stop container group and all containers associated with it
   */
  async stop (): Promise<void> {
    for (const container of this.containers) {
      await container.stop()
    }
    await this.requireNetwork().remove()
  }
}
