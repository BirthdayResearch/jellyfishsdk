import waitForExpect from 'wait-for-expect'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  createToken,
  getNewAddress,
  mintTokens,
  utxosToAccount,
  accountToAccount,
  createPoolPair,
  createSignedTxnHex
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

  describe('utxosToAccount', () => {
    it('should utxosToAccount', async () => {
      const balanceBefore = await container.call('getbalance')
      expect(balanceBefore).toBeGreaterThanOrEqual(300)

      await utxosToAccount(container, 100)

      const balanceAfter = await container.call('getbalance')
      expect(balanceAfter).toBeLessThan(300)
    })
  })

  describe('accountToAccount', () => {
    beforeAll(async () => {
      await container.generate(100)
    })

    it('should accountToAccount', async () => {
      const symbol = 'DAD'
      const from = await container.call('getnewaddress')
      const metadata = {
        symbol,
        name: symbol,
        collateralAddress: from
      }
      await createToken(container, metadata)
      await mintTokens(container, symbol)

      const to = await container.call('getnewaddress')
      await accountToAccount(container, symbol, { amount: 6, from, to })

      await waitForExpect(async () => {
        const accounts = await container.call('listaccounts')
        expect(accounts.length).toBeGreaterThan(0)
      })

      const accounts = await container.call('listaccounts')
      const account = accounts.find((acc: any) => acc.amount === `6.00000000@${symbol}`)
      expect(account.owner.addresses.length).toBeGreaterThan(0)
      expect(account.owner.addresses[0]).toBe(to)
    })
  })

  describe('getNewAddress', () => {
    it('should getNewAddress', async () => {
      const address = await getNewAddress(container)

      expect(typeof address).toBe('string')
    })
  })

  describe('createToken', () => {
    it('should createToken', async () => {
      let assertions = 0
      let tokensLengthBefore = 0

      await waitForExpect(async () => {
        const tokens = await container.call('listtokens')
        expect(Object.keys(tokens).length).toBeGreaterThan(0)
        tokensLengthBefore = Object.keys(tokens).length
      })

      const symbol = 'DDD'
      const metadata = {
        symbol,
        name: symbol,
        isDAT: true,
        mintable: true,
        tradeable: true
      }
      await createToken(container, metadata)

      await waitForExpect(async () => {
        const tokens = await container.call('listtokens')
        expect(Object.keys(tokens).length).toBe(tokensLengthBefore + 1)
      })

      const tokens = await container.call('listtokens')
      for (const k in tokens) {
        const token = tokens[k]
        if (token.symbol === 'DDD') {
          assertions += 1
        }
      }
      expect(assertions).toBe(1)
    })
  })

  describe('mintTokens', () => {
    beforeAll(async () => {
      const metadata = {
        symbol: 'DOA',
        name: 'DOA'
      }
      await createToken(container, metadata)
    })

    it('should mintTokens', async () => {
      const tokensBefore = await container.call('listtokens')
      for (const k in tokensBefore) {
        const tokenBefore = tokensBefore[k]
        if (tokenBefore.symbol === 'DOA') {
          expect(tokenBefore.minted).toBe(0)
        }
      }

      await mintTokens(container, 'DOA')

      const tokensAfter = await container.call('listtokens')
      for (const k in tokensAfter) {
        const tokenAfter = tokensAfter[k]
        if (tokenAfter.symbol === 'DOA') {
          expect(tokenAfter.minted).toBe(2000)
        }
      }
    })
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

  describe('createSignedTxnHex', () => {
    it('should createSignedTxnHex', async () => {
      const signedTxnHex = await createSignedTxnHex(container, 10, 5)
      expect(signedTxnHex.substr(0, 14)).toBe('04000000000101')
      expect(signedTxnHex.substr(86, 82)).toBe('00ffffffff010065cd1d0000000016001468a63bbbdf920211e35ea200cd118d63dfc13b1700024730')
      expect(signedTxnHex).toContain('012103987aec2e508e124468f0f07a836d185b329026e7aaf75be48cf12be8f18cbe8100000000')
    })
  })
})
