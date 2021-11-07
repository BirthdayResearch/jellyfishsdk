import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { TestingGroup } from '@defichain/jellyfish-testing'

describe('wait for block height 10', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should wait for new block height', async () => {
    {
      const count = await client.blockchain.getBlockCount()
      expect(count).toStrictEqual(0)
    }

    {
      const promise = client.blockchain.waitForBlockHeight(10)
      await container.generate(10)

      expect(await promise).toStrictEqual({
        height: 10,
        hash: expect.stringMatching(/^[0-f]{64}$/)
      })

      const count = await client.blockchain.getBlockCount()
      expect(count).toStrictEqual(10)
    }
  })
})

describe('wait for block height 10 on multiple nodes', () => {
  const group = TestingGroup.create(2)

  beforeAll(async () => {
    await group.start()
  })

  afterAll(async () => {
    await group.stop()
  })

  it('should wait for new block height of 10 on another node', async () => {
    await group.get(0).container.generate(10)
    await group.get(1).rpc.blockchain.waitForBlockHeight(10)
  })
})

describe('wait for block height 2 but expire', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should wait for new block with timeout and expire', async () => {
    const result = await client.blockchain.waitForBlockHeight(2, 3000)
    expect(result).toStrictEqual({
      height: 0,
      hash: expect.stringMatching(/^[0-f]{64}$/)
    })
  })
})
