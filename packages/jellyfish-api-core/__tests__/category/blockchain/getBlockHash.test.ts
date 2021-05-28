import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('BlockHash', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getBlockHash', async () => {
    await waitForExpect(async () => {
      const info = await client.blockchain.getBlockchainInfo()
      expect(info.blocks).toBeGreaterThan(1)
    })

    const blockHash: string = await client.blockchain.getBlockHash(1)
    expect(typeof blockHash).toStrictEqual('string')
    expect(blockHash.length).toStrictEqual(64)
  })
})
