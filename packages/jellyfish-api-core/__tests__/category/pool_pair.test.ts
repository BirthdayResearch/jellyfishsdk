import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe.skip('non masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  // TODO(canonbrother): currently the pool pair is empty, no point to test for now
  describe('listPoolPairs', () => {
    it('should listPoolPairs', async () => {
      await waitForExpect(async () => {
        const poolPairs = await client.poolPair.listPoolPairs()
        console.log('poolPairs: ', poolPairs)
      })
    })
  })

  // TODO(canonbrother): pool not found, test again once pool pair is up
  describe('getPoolPair', () => {
    it('should getPoolPair', async () => {
      await waitForExpect(async () => {
        const poolPair = await client.poolPair.getPoolPair('DFI')
        console.log('poolPair: ', poolPair)
      })
    })
  })

  // TODO(canonbrother): empty pool shares, test again once pool shares is up
  describe('listPoolShares', () => {
    it('should listPoolShares', async () => {
      await waitForExpect(async () => {
        const poolShares = await client.poolPair.listPoolShares()
        console.log('poolShares: ', poolShares)
      })
    })
  })
})

describe.skip('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  // TODO(canonbrother): currently the pool pair is empty, no point to test for now
  describe('listPoolPairs', () => {
    it('should listPoolPairs', async () => {
      await waitForExpect(async () => {
        const poolPairs = await client.poolPair.listPoolPairs()
        console.log('poolPairs: ', poolPairs)
      })
    })
  })

  // TODO(canonbrother): pool not found, test again once pool pair is up
  describe('getPoolPair', () => {
    it('should getPoolPair', async () => {
      await waitForExpect(async () => {
        const poolPair = await client.poolPair.getPoolPair('DFI')
        console.log('poolPair: ', poolPair)
      })
    })
  })

  // TODO(canonbrother): empty pool shares, test again once pool shares is up
  describe('listPoolShares', () => {
    it('should listPoolShares', async () => {
      await waitForExpect(async () => {
        const poolShares = await client.poolPair.listPoolShares()
        console.log('poolShares: ', poolShares)
      })
    })
  })
})
