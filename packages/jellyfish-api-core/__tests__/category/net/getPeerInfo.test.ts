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

    it('should return valid schema', async () => {
      for (const peer of await client.net.getPeerInfo()) {
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
