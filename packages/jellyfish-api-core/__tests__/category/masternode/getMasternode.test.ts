import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { MasternodeState } from '../../../src/category/masternode'

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

  it('should get a masternode', async () => {
    let id: string = ''

    const address = await client.wallet.getNewAddress()
    await client.masternode.createMasternode(address)

    await container.generate(1)

    const masterNodes = await client.masternode.listMasternodes()
    for (const mnId in masterNodes) {
      if (masterNodes[mnId].ownerAuthAddress === address) {
        id = mnId
      }
    }

    const masternodeTransaction = await client.masternode.getMasternode(id)

    expect(Object.keys(masternodeTransaction).length).toStrictEqual(1)
    for (const masternodeKey in masternodeTransaction) {
      const data = masternodeTransaction[masternodeKey]
      expect(typeof data.operatorAuthAddress).toStrictEqual('string')
      expect(typeof data.ownerAuthAddress).toStrictEqual('string')
      expect(typeof data.creationHeight).toStrictEqual('number')
      expect(typeof data.resignHeight).toStrictEqual('number')
      expect(typeof data.resignTx).toStrictEqual('string')
      expect(typeof data.banHeight).toStrictEqual('number')
      expect(typeof data.banTx).toStrictEqual('string')
      expect(data.state).toStrictEqual(MasternodeState.PRE_ENABLED)
      expect(typeof data.state).toStrictEqual('string')
      expect(typeof data.mintedBlocks).toStrictEqual('number')
      expect(typeof data.ownerIsMine).toStrictEqual('boolean')
      expect(typeof data.localMasternode).toStrictEqual('boolean')
      expect(typeof data.operatorIsMine).toStrictEqual('boolean')
      expect(data.operatorIsMine).toStrictEqual(true)
      expect(data.operatorIsMine).toStrictEqual(true)
    }
  })

  it('should fail and throw an error with invalid masternode id', async () => {
    const invalidId = '8d4d987dee688e400a0cdc899386f243250d3656d802231755ab4d28178c9816'
    const promise = client.masternode.getMasternode(invalidId)

    await expect(promise).rejects.toThrow('Masternode not found')
  })
})
