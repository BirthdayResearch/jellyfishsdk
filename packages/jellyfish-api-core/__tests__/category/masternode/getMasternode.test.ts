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

  it('should getMasternode', async () => {
    const ownerAddress = await client.wallet.getNewAddress()
    const id = await client.masternode.createMasternode(ownerAddress)

    await container.generate(1)

    const masternode = await client.masternode.getMasternode(id)

    expect(Object.keys(masternode).length).toStrictEqual(1)
    for (const masternodeKey in masternode) {
      const data = masternode[masternodeKey]
      expect(typeof data.operatorAuthAddress).toStrictEqual('string')
      expect(typeof data.ownerAuthAddress).toStrictEqual('string')
      expect(typeof data.creationHeight).toStrictEqual('number')
      expect(typeof data.resignHeight).toStrictEqual('number')
      expect(typeof data.resignTx).toStrictEqual('string')
      expect(typeof data.banTx).toStrictEqual('string')
      expect(data.state).toStrictEqual(MasternodeState.PRE_ENABLED)
      expect(typeof data.state).toStrictEqual('string')
      expect(typeof data.mintedBlocks).toStrictEqual('number')
      expect(typeof data.ownerIsMine).toStrictEqual('boolean')
      expect(typeof data.localMasternode).toStrictEqual('boolean')
      expect(typeof data.operatorIsMine).toStrictEqual('boolean')
      expect(data.operatorIsMine).toStrictEqual(true)
    }
  })

  it('should fail and throw an error with invalid masternode id', async () => {
    const invalidId = '8d4d987dee688e400a0cdc899386f243250d3656d802231755ab4d28178c9816'
    const promise = client.masternode.getMasternode(invalidId)

    await expect(promise).rejects.toThrow('Masternode not found')
  })
})
