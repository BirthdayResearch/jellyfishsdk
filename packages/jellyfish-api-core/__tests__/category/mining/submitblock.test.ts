import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { Testing } from '@defichain/jellyfish-testing'

describe('submit block', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  const testing = Testing.create(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should submit a block', async () => {
    const blockHash = await testing.misc.waitForBlockHash(1)
    const hash = await testing.rpc.blockchain.getBlock(blockHash, 0)
    const promise = client.mining.submitBlock(hash)
    await expect(promise).resolves.not.toThrow()
  })

  it('should throw an error if the block is not valid', async () => {
    const promise = client.mining.submitBlock('block')
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -22,
        message: 'Block decode failed',
        method: 'submitblock'
      }
    })
  })
})
