import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { wallet } from '../../src'

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

  it('should have an error with estimateSmartFee', async () => {
    const result = await client.mining.estimateSmartFee(6)
    const errors = (result.errors != null) ? result.errors : []
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toEqual('Insufficient data or no feerate found')
    expect(result.feerate).toBeUndefined()
  })
})

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)
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
    return await waitForExpect(async () => {
      const result = await client.mining.getNetworkHashPerSecond()
      expect(result).toBeGreaterThan(0)
    })
  })

  it('should getMiningInfo', async () => {
    await waitForExpect(async () => {
      const info = await client.mining.getMiningInfo()
      await expect(info.blocks).toBeGreaterThan(1)
    })

    const info = await client.mining.getMiningInfo()
    const mn1 = info.masternodes[0]

    expect(info.blocks).toBeGreaterThan(0)

    expect(info.currentblockweight).toBeGreaterThan(0)
    expect(info.currentblocktx).toBe(0)

    expect(info.difficulty).toBeDefined()
    expect(info.isoperator).toBe(true)

    expect(mn1.masternodeid).toBeDefined()
    expect(mn1.masternodeoperator).toBeDefined()
    expect(mn1.masternodestate).toBe('ENABLED')
    expect(mn1.generate).toBe(true)
    expect(mn1.mintedblocks).toBe(0)
    expect(mn1.lastblockcreationattempt).toBe('0')

    expect(info.networkhashps).toBeGreaterThan(0)
    expect(info.pooledtx).toBe(0)
    expect(info.chain).toBe('regtest')
    expect(info.warnings).toBe('')
  })
})

describe('estimatesmartfees', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(10)
    await client.wallet.setWalletFlag(wallet.WalletFlag.AVOID_REUSE)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should have estimated smart fees', async () => {
    await waitForExpect(async () => {
      for (let x = 0; x < 200; x++) {
        const address = await client.wallet.getNewAddress()
        await client.wallet.sendToAddress(address, 0.0001)
      }
    })

    const result = await client.mining.estimateSmartFee(6, wallet.Mode.ECONOMICAL)
    expect(result.errors).toBeUndefined()
    expect(result.blocks).toBeGreaterThan(0)
    expect(result.feerate).toBeGreaterThan(0)
  })
})
