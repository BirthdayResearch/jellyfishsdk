import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('BlockHash', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForBlock(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getBlockHash', async () => {
    const blockHash: string = await client.blockchain.getBlockHash(1)
    expect(typeof blockHash).toStrictEqual('string')
    expect(blockHash.length).toStrictEqual(64)
  })

  it('should get regtest genesis block hash', async () => {
    const genesisHash = await client.blockchain.getBlockHash(0)
    expect(genesisHash).toStrictEqual('d744db74fb70ed42767ae028a129365fb4d7de54ba1b6575fb047490554f8a7b')
  })
})
