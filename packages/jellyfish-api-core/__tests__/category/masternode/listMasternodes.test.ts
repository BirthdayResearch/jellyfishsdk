import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasternodePagination, MasternodeState } from '../../../src/category/masternode'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should list masternodes', async () => {
    const masternodes = await client.masternode.listMasternodes()

    for (const masternode in masternodes) {
      const currentMasternode = masternodes[masternode]
      expect(typeof currentMasternode.ownerAuthAddress).toStrictEqual('string')
      expect(typeof currentMasternode.operatorAuthAddress).toStrictEqual('string')
      expect(typeof currentMasternode.creationHeight).toStrictEqual('number')
      expect(typeof currentMasternode.resignHeight).toStrictEqual('number')
      expect(typeof currentMasternode.resignTx).toStrictEqual('string')
      expect(typeof currentMasternode.banHeight).toStrictEqual('number')
      expect(typeof currentMasternode.banTx).toStrictEqual('string')
      expect(currentMasternode.state).toStrictEqual(MasternodeState.ENABLED)
      expect(typeof currentMasternode.mintedBlocks).toStrictEqual('number')
      expect(typeof currentMasternode.ownerIsMine).toStrictEqual('boolean')
      expect(typeof currentMasternode.localMasternode).toStrictEqual('boolean')
      expect(typeof currentMasternode.operatorIsMine).toStrictEqual('boolean')
    }
  })

  it('should list masternodes with verbose set to false to get just the ids', async () => {
    const masternodes = await client.masternode.listMasternodes({}, false)

    for (const value of Object.values(masternodes)) {
      expect(typeof value).toStrictEqual('string')
    }
  })

  it('should list masternodes with limit. Limited to 3 and should return 3', async () => {
    const options: MasternodePagination = { limit: 3 }
    const masternodes = await client.masternode.listMasternodes(options)

    expect(Object.keys(masternodes).length).toStrictEqual(3)
  })
})
