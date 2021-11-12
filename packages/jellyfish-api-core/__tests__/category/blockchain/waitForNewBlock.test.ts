import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { TestingGroup } from '@defichain/jellyfish-testing'

describe('wait for new block', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

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

describe('wait for new block on multiple nodes', () => {
  const group = TestingGroup.create(2)

  beforeAll(async () => {
    await group.start()
  })

  afterAll(async () => {
    await group.stop()
  })

  it('should wait for new block on another node', async () => {
    await group.get(0).generate(1)
    await group.waitForSync()

    // hold on to await to resolve later
    const promise = group.get(1).rpc.blockchain.waitForNewBlock()
    await group.get(0).generate(1)

    expect(await promise).toStrictEqual({
      height: 2,
      hash: expect.stringMatching(/^[0-f]{64}$/)
    })

    const count = await group.get(1).rpc.blockchain.getBlockCount()
    expect(count).toStrictEqual(2)
  })
})

describe('wait for new block but expire', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

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
