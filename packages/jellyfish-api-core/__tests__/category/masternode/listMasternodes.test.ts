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

  it('should listMasternodes', async () => {
    const masternodeList = await client.masternode.listMasternodes()

    expect(Object.keys(masternodeList).length).toBeGreaterThanOrEqual(1)
    for (const masternode in masternodeList) {
      const currentMasternode = masternodeList[masternode]
      expect(typeof currentMasternode.ownerAuthAddress).toStrictEqual('string')
      expect(typeof currentMasternode.operatorAuthAddress).toStrictEqual('string')
      expect(typeof currentMasternode.creationHeight).toStrictEqual('number')
      expect(typeof currentMasternode.resignHeight).toStrictEqual('number')
      expect(typeof currentMasternode.resignTx).toStrictEqual('string')
      expect(typeof currentMasternode.banTx).toStrictEqual('string')
      expect(currentMasternode.state).toStrictEqual(MasternodeState.ENABLED)
      expect(typeof currentMasternode.mintedBlocks).toStrictEqual('number')
      expect(typeof currentMasternode.ownerIsMine).toStrictEqual('boolean')
      expect(typeof currentMasternode.localMasternode).toStrictEqual('boolean')
      expect(typeof currentMasternode.operatorIsMine).toStrictEqual('boolean')
      if (currentMasternode.targetMultiplier !== undefined) {
        expect(typeof currentMasternode.targetMultiplier).toStrictEqual('number')
      }
      if (currentMasternode.targetMultipliers !== undefined) {
        expect(typeof currentMasternode.targetMultipliers).toStrictEqual('object')
      }
      if (currentMasternode.timelock !== undefined) {
        expect(typeof currentMasternode.timelock).toStrictEqual('number')
      }
    }
  })

  it('should listMasternodes with verbose false', async () => {
    const masternodeList = await client.masternode.listMasternodes({}, false)
    for (const value of Object.values(masternodeList)) {
      expect(typeof value).toStrictEqual('string')
    }
  })

  it('should listMasternodes with limit', async () => {
    const masternodeList = await client.masternode.listMasternodes({ limit: 3 })
    expect(Object.keys(masternodeList).length).toStrictEqual(3)
  })

  it('should listMasternodes with pagination start and including_start', async () => {
    const prevMasternodes = await client.masternode.listMasternodes()
    const startId = Object.keys(prevMasternodes)[2]
    const masterNodeLengthBefore = Object.keys(prevMasternodes).length

    const pagination: MasternodePagination = {
      start: startId,
      including_start: true
    }
    const masternodeList = await client.masternode.listMasternodes(pagination)

    const masternodeLengthAfter = Object.keys(masternodeList).length
    expect(masternodeLengthAfter).toStrictEqual(masterNodeLengthBefore - 2)

    for (const masternode in masternodeList) {
      const currentMasternode = masternodeList[masternode]
      expect(typeof currentMasternode.ownerAuthAddress).toStrictEqual('string')
      expect(typeof currentMasternode.operatorAuthAddress).toStrictEqual('string')
      expect(typeof currentMasternode.creationHeight).toStrictEqual('number')
      expect(typeof currentMasternode.resignHeight).toStrictEqual('number')
      expect(typeof currentMasternode.resignTx).toStrictEqual('string')
      expect(typeof currentMasternode.banTx).toStrictEqual('string')
      expect(currentMasternode.state).toStrictEqual(MasternodeState.ENABLED)
      expect(typeof currentMasternode.mintedBlocks).toStrictEqual('number')
      expect(typeof currentMasternode.ownerIsMine).toStrictEqual('boolean')
      expect(typeof currentMasternode.localMasternode).toStrictEqual('boolean')
      expect(typeof currentMasternode.operatorIsMine).toStrictEqual('boolean')
    }
  })
})
