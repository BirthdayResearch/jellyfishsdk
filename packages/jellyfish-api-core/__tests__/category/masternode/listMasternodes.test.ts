import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasternodePagination } from '../../../src/category/masternode'

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
      const createdMasternode = masternodes[masternode]
      expect(typeof createdMasternode.ownerAuthAddress).toStrictEqual('string')
      expect(typeof createdMasternode.operatorAuthAddress).toStrictEqual('string')
      expect(typeof createdMasternode.creationHeight).toStrictEqual('number')
      expect(typeof createdMasternode.resignHeight).toStrictEqual('number')
      expect(typeof createdMasternode.resignTx).toStrictEqual('string')
      expect(typeof createdMasternode.banHeight).toStrictEqual('number')
      expect(typeof createdMasternode.banTx).toStrictEqual('string')
      expect(typeof createdMasternode.state).toStrictEqual('string')
      expect(typeof createdMasternode.mintedBlocks).toStrictEqual('number')
      expect(typeof createdMasternode.targetMultiplier).toStrictEqual('number')
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
