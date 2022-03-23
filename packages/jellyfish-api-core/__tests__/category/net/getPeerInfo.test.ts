import { RegTestContainer } from '@defichain/testcontainers'
import { PeerInfo } from 'packages/jellyfish-api-core/src/category/net'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { TestingGroup } from '@defichain/jellyfish-testing'

const addrRegExp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(:[0-9]{1,5})?$/

describe('Network without masternode', () => {
  const container = [
    new RegTestContainer(),
    new RegTestContainer()
  ]
  const client = new ContainerAdapterClient(container[0])

  beforeAll(async () => {
    const networkId = await container[0].createNetwork('test')
    await container[0].connectNetwork(networkId)
    await container[1].connectNetwork(networkId)

    await container[0].start()
    await container[1].start()

    // addnode
    await container[0].addNode(await container[1].getIp('test'))
  })

  afterAll(async () => {
    await container[0].stop()
    await container[1].stop()
  })

  it('should getPeerInfo', async () => {
    const peers: PeerInfo[] = await client.net.getPeerInfo()

    expect(peers.length).toBeGreaterThan(0)

    for (const peer of peers) {
      expect(typeof peer.id).toStrictEqual('number')

      expect(typeof peer.addr).toStrictEqual('string')
      expect(addrRegExp.test(peer.addr)).toBeTruthy()

      if (peer.addrbind !== undefined) {
        expect(typeof peer.addrbind).toStrictEqual('string')
        expect(addrRegExp.test(peer.addrbind)).toBeTruthy()
      }

      if (peer.addrlocal !== undefined) {
        expect(typeof peer.addrlocal).toStrictEqual('string')
        expect(addrRegExp.test(peer.addrlocal)).toBeTruthy()
      }

      expect(typeof peer.services).toStrictEqual('string')
      expect(peer.services).toHaveLength(16)

      expect(typeof peer.relaytxes).toStrictEqual('boolean')
      expect(typeof peer.lastsend).toStrictEqual('number')
      expect(typeof peer.lastrecv).toStrictEqual('number')
      expect(typeof peer.bytessent).toStrictEqual('number')
      expect(typeof peer.bytesrecv).toStrictEqual('number')
      expect(typeof peer.conntime).toStrictEqual('number')
      expect(typeof peer.timeoffset).toStrictEqual('number')

      if (peer.pingtime !== undefined) {
        expect(typeof peer.pingtime).toStrictEqual('number')
      }

      if (peer.minping !== undefined) {
        expect(typeof peer.minping).toStrictEqual('number')
      }

      if (peer.pingwait !== undefined) {
        expect(typeof peer.pingwait).toStrictEqual('number')
      }

      expect(typeof peer.version).toStrictEqual('number')
      expect(typeof peer.subver).toStrictEqual('string')
      expect(typeof peer.inbound).toStrictEqual('boolean')
      expect(typeof peer.addnode).toStrictEqual('boolean')
      expect(typeof peer.startingheight).toStrictEqual('number')

      if (peer.banscore !== undefined) {
        expect(typeof peer.banscore).toStrictEqual('number')
      }

      if (peer.synced_headers !== undefined) {
        expect(typeof peer.synced_headers).toStrictEqual('number')
      }

      if (peer.synced_blocks !== undefined) {
        expect(typeof peer.synced_blocks).toStrictEqual('number')
      }

      expect(typeof peer.inflight).toStrictEqual('object')
      expect(typeof peer.whitelisted).toStrictEqual('boolean')
      expect(typeof peer.permissions).toStrictEqual('object')
      expect(typeof peer.minfeefilter).toStrictEqual('number')

      for (const key in peer.bytessent_per_msg) {
        expect(typeof peer.bytessent_per_msg[key]).toStrictEqual('number')
      }

      for (const key in peer.bytesrecv_per_msg) {
        expect(typeof peer.bytesrecv_per_msg[key]).toStrictEqual('number')
      }
    }
  })
})

describe('Network with masternode', () => {
  const tgroup = TestingGroup.create(2)
  const { rpc: { net } } = tgroup.get(0)

  beforeAll(async () => {
    await tgroup.start()
  })

  afterAll(async () => {
    await tgroup.stop()
  })

  it('should getPeerInfo', async () => {
    const peers: PeerInfo[] = await net.getPeerInfo()

    expect(peers.length).toBeGreaterThan(0)

    for (const peer of peers) {
      expect(typeof peer.id).toStrictEqual('number')

      expect(typeof peer.addr).toStrictEqual('string')
      expect(addrRegExp.test(peer.addr)).toBeTruthy()

      if (peer.addrbind !== undefined) {
        expect(typeof peer.addrbind).toStrictEqual('string')
        expect(addrRegExp.test(peer.addrbind)).toBeTruthy()
      }

      if (peer.addrlocal !== undefined) {
        expect(typeof peer.addrlocal).toStrictEqual('string')
        expect(addrRegExp.test(peer.addrlocal)).toBeTruthy()
      }

      expect(typeof peer.services).toStrictEqual('string')
      expect(peer.services).toHaveLength(16)

      expect(typeof peer.relaytxes).toStrictEqual('boolean')
      expect(typeof peer.lastsend).toStrictEqual('number')
      expect(typeof peer.lastrecv).toStrictEqual('number')
      expect(typeof peer.bytessent).toStrictEqual('number')
      expect(typeof peer.bytesrecv).toStrictEqual('number')
      expect(typeof peer.conntime).toStrictEqual('number')
      expect(typeof peer.timeoffset).toStrictEqual('number')

      if (peer.pingtime !== undefined) {
        expect(typeof peer.pingtime).toStrictEqual('number')
      }

      if (peer.minping !== undefined) {
        expect(typeof peer.minping).toStrictEqual('number')
      }

      if (peer.pingwait !== undefined) {
        expect(typeof peer.pingwait).toStrictEqual('number')
      }

      expect(typeof peer.version).toStrictEqual('number')
      expect(typeof peer.subver).toStrictEqual('string')
      expect(typeof peer.inbound).toStrictEqual('boolean')
      expect(typeof peer.addnode).toStrictEqual('boolean')
      expect(typeof peer.startingheight).toStrictEqual('number')

      if (peer.banscore !== undefined) {
        expect(typeof peer.banscore).toStrictEqual('number')
      }

      if (peer.synced_headers !== undefined) {
        expect(typeof peer.synced_headers).toStrictEqual('number')
      }

      if (peer.synced_blocks !== undefined) {
        expect(typeof peer.synced_blocks).toStrictEqual('number')
      }

      expect(typeof peer.inflight).toStrictEqual('object')
      expect(typeof peer.whitelisted).toStrictEqual('boolean')
      expect(typeof peer.permissions).toStrictEqual('object')
      expect(typeof peer.minfeefilter).toStrictEqual('number')

      for (const key in peer.bytessent_per_msg) {
        expect(typeof peer.bytessent_per_msg[key]).toStrictEqual('number')
      }

      for (const key in peer.bytesrecv_per_msg) {
        expect(typeof peer.bytesrecv_per_msg[key]).toStrictEqual('number')
      }
    }
  })
})
