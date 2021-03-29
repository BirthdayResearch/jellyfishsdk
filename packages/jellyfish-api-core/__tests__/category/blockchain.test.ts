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

  it('should getBlockchainInfo', async () => {
    const info = await client.blockchain.getBlockchainInfo()

    expect(info.chain).toBe('regtest')
    expect(info.blocks).toBe(0)
    expect(info.headers).toBe(0)

    expect(info.bestblockhash.length).toBe(64)
    expect(info.difficulty).toBeGreaterThan(0)
    expect(info.mediantime).toBeGreaterThan(1550000000)

    expect(info.verificationprogress).toBe(1)
    expect(info.initialblockdownload).toBe(true)
    expect(info.chainwork.length).toBe(64)
    expect(info.size_on_disk).toBeGreaterThan(0)
    expect(info.pruned).toBe(false)

    expect(Object.keys(info.softforks).length).toBe(10)

    expect(info.softforks.amk.type).toBe('buried')
    expect(info.softforks.amk.active).toBe(true)
    expect(info.softforks.amk.height).toBe(0)

    expect(info.softforks.segwit.type).toBe('buried')
    expect(info.softforks.segwit.active).toBe(true)
    expect(info.softforks.segwit.height).toBe(0)
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

  it('should getBlockchainInfo', async () => {
    await waitForExpect(async () => {
      const info = await client.blockchain.getBlockchainInfo()
      await expect(info.blocks).toBeGreaterThan(1)
    })

    const info = await client.blockchain.getBlockchainInfo()

    expect(info.chain).toBe('regtest')
    expect(info.blocks).toBeGreaterThan(0)
    expect(info.headers).toBeGreaterThan(0)

    expect(info.bestblockhash.length).toBe(64)
    expect(info.difficulty).toBeGreaterThan(0)
    expect(info.mediantime).toBeGreaterThan(1550000000)

    expect(info.verificationprogress).toBe(1)
    expect(info.initialblockdownload).toBe(false)
    expect(info.chainwork.length).toBe(64)
    expect(info.size_on_disk).toBeGreaterThan(0)
    expect(info.pruned).toBe(false)

    expect(Object.keys(info.softforks).length).toBe(10)
  })
})
