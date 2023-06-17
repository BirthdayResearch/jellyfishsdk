import { MasterNodeRegTestContainer, StartFlags } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Retrieve a BIP 157 content filter for a particular block', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    const startFlags: StartFlags[] = [{ name: 'blockfilterindex', value: 1 }]
    await container.start({ startFlags: startFlags })
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should retrieve a BIP 157 content filter for genesis block', async () => {
    {
      const blockhash = await client.blockchain.getBlockHash(0)
      const promise = client.blockchain.getBlockFilter(blockhash)

      expect(await promise).toStrictEqual({
        filter: expect.stringMatching(/^[0-9a-f]{1,}$/),
        header: expect.stringMatching(/^[0-9a-f]{64}$/)
      })
    }
  })

  it('should retrieve a BIP 157 content filter for a new block', async () => {
    {
      const count = await client.blockchain.getBlockCount()
      expect(count).toStrictEqual(0)
    }

    {
      await container.generate(1)

      const blockhash = await client.blockchain.getBlockHash(1)
      const promise = client.blockchain.getBlockFilter(blockhash)

      expect(await promise).toStrictEqual({
        filter: expect.stringMatching(/^[0-9a-f]+$/),
        header: expect.stringMatching(/^[0-9a-f]{64}$/)
      })

      const count = await client.blockchain.getBlockCount()
      expect(count).toStrictEqual(1)
    }
  })
})
