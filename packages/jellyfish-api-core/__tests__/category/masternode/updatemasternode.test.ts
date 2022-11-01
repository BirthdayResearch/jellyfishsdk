import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should updateMasternode', async () => {
    const ownerAddress1 = await container.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress1)

    await container.generate(20)

    const masternodesBefore = await client.masternode.listMasternodes()
    const masternodesLengthBefore = Object.keys(masternodesBefore).length

    const ownerAddress2 = await container.getNewAddress()
    await client.masternode.updateMasternode(masternodeId, {
      ownerAddress: ownerAddress2
    })

    await container.generate(60)

    const masternodesAfter = await client.masternode.listMasternodes()
    const masternodesLengthAfter = Object.keys(masternodesAfter).length
    expect(masternodesLengthAfter).toStrictEqual(masternodesLengthBefore)

    const mn = masternodesAfter[masternodeId]
    if (mn === undefined) {
      throw new Error('should not reach here')
    }

    expect(mn).toStrictEqual({
      operatorAuthAddress: ownerAddress1,
      ownerAuthAddress: ownerAddress2,
      creationHeight: expect.any(Number),
      resignHeight: expect.any(Number),
      resignTx: expect.any(String),
      collateralTx: expect.any(String),
      rewardAddress: expect.any(String),
      state: expect.any(String),
      mintedBlocks: expect.any(Number),
      ownerIsMine: expect.any(Boolean),
      localMasternode: expect.any(Boolean),
      operatorIsMine: expect.any(Boolean)
    })
  })
})
