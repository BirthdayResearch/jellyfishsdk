import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { PeerInfo } from 'packages/jellyfish-api-core/src/category/net'
import { ContainerAdapterClient } from '../../container_adapter_client'
import Dockerode from 'dockerode'

createNetworkTests('Network without masternode', [new RegTestContainer(), new RegTestContainer()])
createNetworkTests('Network on masternode', [new MasterNodeRegTestContainer(), new MasterNodeRegTestContainer()])

function createNetworkTests (name: string, container: RegTestContainer[] | MasterNodeRegTestContainer[]): void {
  describe(name, () => {
    const client = new ContainerAdapterClient(container[0])
    let createdNetwork: Dockerode.NetworkInspectInfo

    beforeAll(async () => {
      await container[0].start()
      await container[0].createNetwork('test')
      const networks = await container[0].listNetworks()
      createdNetwork = networks.find(n => n.Name === 'test') as Dockerode.NetworkInspectInfo
      await container[0].connectNetwork(createdNetwork.Id)

      await container[1].start()
      await container[1].connectNetwork(createdNetwork.Id)

      // addnode
      await container[0].addNode(await container[1].getIp('test'))
    })

    afterAll(async () => {
      await container[0].stop()
      await container[1].stop()

      await container[0].removeNetwork(createdNetwork.Id)
    })

    it('should getPeerInfo', async () => {
      const peers: PeerInfo[] = await client.net.getPeerInfo()

      expect(peers.length).toBeGreaterThan(0)

      for (const peer of peers) {
        expect(typeof peer.id).toStrictEqual('number')

        expectValidAddress(peer.addr)

        expectUndefinedOrValidAddress(peer.addrbind)
        expectUndefinedOrValidAddress(peer.addrlocal)

        expect(typeof peer.services).toStrictEqual('string')
        expect(peer.services).toHaveLength(16)

        expect(typeof peer.relaytxes).toStrictEqual('boolean')
        expect(typeof peer.lastsend).toStrictEqual('number')
        expect(typeof peer.lastrecv).toStrictEqual('number')
        expect(typeof peer.bytessent).toStrictEqual('number')
        expect(typeof peer.bytesrecv).toStrictEqual('number')
        expect(typeof peer.conntime).toStrictEqual('number')
        expect(typeof peer.timeoffset).toStrictEqual('number')

        expectUndefinedOrEquals('number', peer.pingtime)
        expectUndefinedOrEquals('number', peer.minping)
        expectUndefinedOrEquals('number', peer.pingwait)

        expect(typeof peer.version).toStrictEqual('number')
        expect(typeof peer.subver).toStrictEqual('string')
        expect(typeof peer.inbound).toStrictEqual('boolean')
        expect(typeof peer.addnode).toStrictEqual('boolean')
        expect(typeof peer.startingheight).toStrictEqual('number')

        expectUndefinedOrEquals('number', peer.banscore)
        expectUndefinedOrEquals('number', peer.synced_headers)
        expectUndefinedOrEquals('number', peer.synced_blocks)

        expect(typeof peer.inflight).toStrictEqual('object')
        expect(typeof peer.whitelisted).toStrictEqual('boolean')
        expect(typeof peer.permissions).toStrictEqual('object')
        expect(typeof peer.minfeefilter).toStrictEqual('number')

        expectValidBytesPerMessage(peer.bytessent_per_msg)
        expectValidBytesPerMessage(peer.bytesrecv_per_msg)
      }
    })
  })
}

function expectUndefinedOrEquals (expected: any, actual?: any): void {
  if (actual !== undefined) {
    expect(typeof actual).toStrictEqual(expected)
  }
}

function expectUndefinedOrValidAddress (address?: string): void {
  if (address !== undefined) {
    expectValidAddress(address)
  }
}

function expectValidAddress (address: string): void {
  expect(typeof address).toStrictEqual('string')
  expect(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(:[0-9]{1,5})?$/.test(address)).toBeTruthy()
}

function expectValidBytesPerMessage (obj: Record<string, number>): void {
  for (const key in obj) {
    expect(typeof obj[key]).toStrictEqual('number')
  }
}
