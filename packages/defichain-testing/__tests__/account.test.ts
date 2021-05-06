import waitForExpect from 'wait-for-expect'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import {
  createToken,
  mintTokens,
  utxosToAccount,
  accountToAccount
} from '../src'

describe('account', () => {
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
})
