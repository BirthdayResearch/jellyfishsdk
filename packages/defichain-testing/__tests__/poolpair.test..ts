import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  createToken,
  getNewAddress,
  createPoolPair
} from '../src'

describe('utils', () => {
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

  describe('createPoolPair', () => {
    beforeAll(async () => {
      await createToken(container, { symbol: 'DOG', name: 'DOG' })
    })

    it('should createPoolPair', async () => {
      let assertions = 0

      const poolpairsBefore = await container.call('listpoolpairs')
      const poolpairsLengthBefore = Object.keys(poolpairsBefore).length

      const address = await getNewAddress(container)
      const metadata = {
        tokenA: 'DFI',
        tokenB: 'DOG',
        commission: 1,
        status: true,
        ownerAddress: address
      }
      const data = await createPoolPair(container, metadata)
      expect(typeof data).toBe('string')

      const poolpairsAfter = await container.call('listpoolpairs')
      expect(Object.keys(poolpairsAfter).length).toBe(poolpairsLengthBefore + 1)

      for (const k in poolpairsAfter) {
        const poolpair = poolpairsAfter[k]
        if (poolpair.name === 'Default Defi token-DOG') {
          assertions += 1
        }
      }
      expect(assertions).toBe(1)
    })
  })
})
