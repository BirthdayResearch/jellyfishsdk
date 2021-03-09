import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('non masternode', () => {
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

    expect(info.blocks).toBe(0)
    expect(info.difficulty).toBeDefined()
    expect(info.isoperator).toBe(false)
    expect(info.networkhashps).toBe(0)
    expect(info.pooledtx).toBe(0)
    expect(info.chain).toBe('regtest')
    expect(info.warnings).toBe('')
  })

  it('should getNetworkHashPerSecond', async () => {
    const result = await client.mining.getNetworkHashPerSecond()
    expect(result).toBe(0)
  })
})

describe('masternode', () => {
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
    const info = await client.mining.getMintingInfo()

    await waitForExpect(async () => {
      const info = await container.getMintingInfo()
      expect(info.blocks).toBeGreaterThan(1)
    })

    expect(info.blocks).toBeGreaterThan(0)

    expect(info.currentblockweight).toBeGreaterThan(0)
    expect(info.currentblocktx).toBe(0)

    expect(info.difficulty).toBeDefined()
    expect(info.isoperator).toBe(true)

    expect(info.masternodeid).toBeDefined()
    expect(info.masternodeoperator).toBeDefined()
    expect(info.masternodestate).toBe('ENABLED')
    expect(info.generate).toBe(true)
    expect(info.mintedblocks).toBe(0)

    expect(info.networkhashps).toBeGreaterThan(0)
    expect(info.pooledtx).toBe(0)
    expect(info.chain).toBe('regtest')
    expect(info.warnings).toBe('')
  })

  it('should getNetworkHashPerSecond', async () => {
    const result = await client.mining.getNetworkHashPerSecond()
    expect(result).toBeGreaterThan(0)
  })
})
