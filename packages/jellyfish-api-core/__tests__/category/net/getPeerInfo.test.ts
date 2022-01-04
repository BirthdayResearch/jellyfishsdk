import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

createNetworkTests('Network without masternode', new RegTestContainer())
createNetworkTests('Network with masternode', new MasterNodeRegTestContainer())

function createNetworkTests (name: string, container: RegTestContainer | MasterNodeRegTestContainer): void {
  describe(name, () => {
    const client = new ContainerAdapterClient(container)

    beforeAll(async () => {
      await container.start()
      await container.addNode('127.0.0.1')
    })

    afterAll(async () => {
      await container.stop()
    })

    it('should return a list of peers', async () => {
      await expect(client.net.getPeerInfo()).resolves.toHaveLength(2)
    })

    it('should return expected schema', async () => {
      for (const peer of await client.net.getPeerInfo()) {
        expect(typeof peer.id).toStrictEqual('number')
        expect(typeof peer.addr).toStrictEqual('string')
        expect(typeof peer.addrbind).toStrictEqual('string')
        expect(typeof peer.services).toStrictEqual('string')
        expect(typeof peer.relaytxes).toStrictEqual('boolean')
        expect(typeof peer.lastsend).toStrictEqual('number')
        expect(typeof peer.lastrecv).toStrictEqual('number')
        expect(typeof peer.conntime).toStrictEqual('number')
        expect(typeof peer.timeoffset).toStrictEqual('number')
        expect(typeof peer.version).toStrictEqual('number')
        expect(typeof peer.subver).toStrictEqual('string')
        expect(typeof peer.inbound).toStrictEqual('boolean')
        expect(typeof peer.addnode).toStrictEqual('boolean')
        expect(typeof peer.startingheight).toStrictEqual('number')
        expect(typeof peer.banscore).toStrictEqual('number')
        expect(typeof peer.synced_headers).toStrictEqual('number')
        expect(typeof peer.synced_blocks).toStrictEqual('number')
        expect(typeof peer.inflight).toStrictEqual('object')
        expect(typeof peer.whitelisted).toStrictEqual('boolean')
        expect(typeof peer.permissions).toStrictEqual('object')
        expect(typeof peer.minfeefilter).toStrictEqual('number')
        expect(typeof peer.bytessent_per_msg).toStrictEqual('object')
        expect(typeof peer.bytesrecv_per_msg).toStrictEqual('object')
      }
    })

    it('should return valid values', async () => {
      for (const peer of await client.net.getPeerInfo()) {
        expectValidAddress(peer.addr)
        expectValidAddress(peer.addrbind)

        expect(peer.services).toHaveLength(16)

        expectValidBytesPerMessage(peer.bytessent_per_msg)
        expectValidBytesPerMessage(peer.bytesrecv_per_msg)
      }
    })
  })
}

function expectValidAddress (address: string): void {
  return expect(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(:[0-9]{1,5})?$/.test(address)).toBeTruthy()
}

function expectValidBytesPerMessage (obj: Record<string, number>): void {
  for (const key in obj) {
    expect(obj[key]).toBeGreaterThanOrEqual(0)
  }
}
