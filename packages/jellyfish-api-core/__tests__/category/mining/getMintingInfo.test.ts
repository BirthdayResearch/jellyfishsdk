import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('Mining without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getMintingInfo', async () => {
    const info = await client.mining.getMintingInfo()

    expect(info.blocks).toStrictEqual(0)
    expect(info.difficulty).toBeDefined()
    expect(info.isoperator).toStrictEqual(false)
    expect(info.networkhashps).toStrictEqual(0)
    expect(info.pooledtx).toStrictEqual(0)
    expect(info.chain).toStrictEqual('regtest')
    expect(info.warnings).toStrictEqual('')
  })
})

describe('Mining on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should getMintingInfo', async () => {
    await waitForExpect(async () => {
      const info = await client.mining.getMintingInfo()
      await expect(info.blocks).toBeGreaterThan(1)
    })

    const info = await client.mining.getMintingInfo()

    expect(info.blocks).toBeGreaterThan(0)

    expect(info.currentblockweight).toBeGreaterThan(0)
    expect(info.currentblocktx).toStrictEqual(0)

    expect(info.difficulty).toBeDefined()
    expect(info.isoperator).toStrictEqual(true)

    expect(info.masternodeid).toBeDefined()
    expect(info.masternodeoperator).toBeDefined()
    expect(info.masternodestate).toStrictEqual('ENABLED')
    expect(info.generate).toStrictEqual(true)
    expect(info.mintedblocks).toStrictEqual(0)

    expect(info.networkhashps).toBeGreaterThan(0)
    expect(info.pooledtx).toStrictEqual(0)
    expect(info.chain).toStrictEqual('regtest')
    expect(info.warnings).toStrictEqual('')
  })
})
