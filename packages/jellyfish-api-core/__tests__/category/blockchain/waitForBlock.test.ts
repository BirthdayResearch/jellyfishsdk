import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { TestingGroup } from '@defichain/jellyfish-testing'

describe('Waits for a specific new block and returns useful info about it', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should wait for block', async () => {
    {
      const count = await client.blockchain.getBlockCount()
      expect(count).toStrictEqual(0)
    }

    {
      await container.generate(20)

      const blockhash = await client.blockchain.getBlockHash(20)
      const promise = client.blockchain.waitForBlock(blockhash)

      await container.restart()

      expect(await promise).toStrictEqual({
        height: 20,
        hash: blockhash
      })

      const count = await client.blockchain.getBlockCount()
      expect(count).toStrictEqual(20)
    }
  })
})

describe('wait for block on multiple nodes', () => {
  const group = TestingGroup.create(2)

  beforeAll(async () => {
    await group.start()
  })

  afterAll(async () => {
    await group.stop()
  })

  it('should wait for new block on another node', async () => {
    await group.get(0).generate(2)

    const blockhash = await group.get(0).rpc.blockchain.getBlockHash(2)

    // hold on to await to resolve later
    const promise = group.get(1).rpc.blockchain.waitForBlock(blockhash)

    expect(await promise).toStrictEqual({
      height: 2,
      hash: blockhash
    })

    const count = await group.get(1).rpc.blockchain.getBlockCount()
    expect(count).toStrictEqual(2)
  })
})
