import { Block, Transaction } from '@defichain/jellyfish-api-core/category/blockchain'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('setMockTime', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  async function getBlock (): Promise<Block<Transaction>> {
    const count = await client.blockchain.getBlockCount()
    const hash = await client.blockchain.getBlockHash(count)
    return await client.blockchain.getBlock(hash, 2)
  }

  it('should be able to mock time', async () => {
    const blockA = await getBlock()

    const secondInDay = 60 * 60 * 24
    const ts = blockA.time + secondInDay
    await client.misc.setMockTime(ts)
    await container.generate(1)

    const blockB = await getBlock()

    expect(blockB.time).toStrictEqual(ts)
    const diff = blockB.time - blockA.time
    expect(diff).toStrictEqual(secondInDay)
  })
})
