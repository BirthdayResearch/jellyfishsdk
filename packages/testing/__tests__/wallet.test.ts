import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  getNewAddress
} from '../src'

describe('wallet', () => {
  const container = new MasterNodeRegTestContainer()

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(300)
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('getNewAddress', () => {
    it('should getNewAddress', async () => {
      const address = await getNewAddress(container)

      expect(typeof address).toBe('string')
    })
  })
})
