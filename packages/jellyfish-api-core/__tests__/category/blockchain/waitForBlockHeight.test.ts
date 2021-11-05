import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

const container = new MasterNodeRegTestContainer()
const client = new ContainerAdapterClient(container)

describe('new block', () => {
  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should wait for new block', async () => {
    {
      const count = await client.blockchain.getBlockCount()
      expect(count).toStrictEqual(0)
    }

    {
      const promise = client.blockchain.waitForNewBlock()
      await container.generate(1)

      expect(await promise).toStrictEqual({
        height: 1,
        hash: expect.stringMatching(/^[0-f]{64}$/)
      })

      const count = await client.blockchain.getBlockCount()
      expect(count).toStrictEqual(1)
    }
  })
})

describe('new block but expire', () => {
  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should wait for new block with timeout and expire', async () => {
    const result = await client.blockchain.waitForNewBlock(1000)
    expect(result).toStrictEqual({
      height: 0,
      hash: expect.stringMatching(/^[0-f]{64}$/)
    })
  })
})
