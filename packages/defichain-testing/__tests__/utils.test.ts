import waitForExpect from 'wait-for-expect'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { Elliptic } from '@defichain/jellyfish-crypto'
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
      const aPrivKey = '619c335025c7f4012e556c2a58b2506e30b8511b53ade95ea316fd8c3286feb9'
      const bPrivKey = '557c4bdff86e59015987c1c7f3328a1fb4c2177b5e834f09c8cd10fae51af93b'
      const aPrivateKey = Buffer.from(aPrivKey, 'hex')
      const bPrivateKey = Buffer.from(bPrivKey, 'hex')
      const aEllipticPair = Elliptic.fromPrivKey(aPrivateKey)
      const bEllipticPair = Elliptic.fromPrivKey(bPrivateKey)

      const signedTxnHex = await createSignedTxnHex(container, 10, 5, { aEllipticPair, bEllipticPair })
      expect(signedTxnHex.substr(0, 14)).toBe('04000000000101')
      expect(signedTxnHex.substr(86, 82)).toBe('00ffffffff010065cd1d0000000016001425a544c073cbca4e88d59f95ccd52e584c7e6a8200024730')
      expect(signedTxnHex).toContain('0121025476c2e83188368da1ff3e292e7acafcdb3566bb0ad253f62fc70f07aeee635700000000')
    })
  })
})
