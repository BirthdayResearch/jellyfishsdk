import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('BestBlockHash', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should get hash of best block and return a string', async () => {
    const bestBlockHash = await client.blockchain.getBestBlockHash()

    expect(typeof bestBlockHash).toStrictEqual('string')
  })
})
