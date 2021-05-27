import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import BigNumber from 'bignumber.js'

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    await setup()
  })

  afterAll(async () => {
    await container.stop()
  })

  async function setup (): Promise<void> {
    const from = await container.call('getnewaddress')
    await createToken(from, 'DBTC', 200)

    const to = await accountToAccount('DBTC', 5, from)
    await accountToAccount('DBTC', 18, from, to)

    await createToken(from, 'DETH', 200)
    await accountToAccount('DETH', 46, from)
  }

  async function createToken (address: string, symbol: string, amount: number): Promise<void> {
    const metadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await container.waitForWalletBalanceGTE(101)
    await container.call('createtoken', [metadata])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  async function accountToAccount (symbol: string, amount: number, from: string, _to = ''): Promise<string> {
    const to = _to !== '' ? _to : await container.call('getnewaddress')

    await container.call('accounttoaccount', [from, { [to]: `${amount.toString()}@${symbol}` }])
    await container.generate(1)

    return to
  }

  async function waitForListingAccounts (): Promise<any[]> {
    let accounts: any[] = []

    await waitForExpect(async () => {
      accounts = await client.account.listAccounts()
      expect(accounts.length).toBeGreaterThan(0)
    })

    return accounts
  }

  describe('listAccounts', () => {
    it('should listAccounts', async () => {
      await waitForListingAccounts()

      const accounts = await client.account.listAccounts()

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toStrictEqual('string')
        expect(typeof account.owner === 'object').toStrictEqual(true)
        expect(typeof account.owner.asm).toStrictEqual('string')
        expect(account.owner.reqSigs instanceof BigNumber).toStrictEqual(true)
        expect(typeof account.owner.type).toStrictEqual('string')
        expect(account.owner.addresses.length).toBeGreaterThan(0)
        expect(typeof account.amount).toStrictEqual('string') // 10.00000000@DFI
      }
    })

    it('should listAccounts with pagination start and including_start', async () => {
      const accounts = await waitForListingAccounts()

      const pagination = {
        start: accounts[accounts.length - 1].key,
        including_start: true
      }

      const lastAccounts = await client.account.listAccounts(pagination)
      expect(lastAccounts.length).toStrictEqual(1)
    })

    it('should listAccounts with pagination.limit', async () => {
      await waitForExpect(async () => {
        const pagination = {
          limit: 2
        }
        const accounts = await client.account.listAccounts(pagination)
        expect(accounts.length).toStrictEqual(2)
      })
    })

    it('should listAccounts with verbose false and indexed_amounts false', async () => {
      await waitForListingAccounts()

      const accounts = await client.account.listAccounts({}, false, { indexedAmounts: false, isMineOnly: false })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toStrictEqual('string')
        expect(typeof account.owner).toStrictEqual('string')
        expect(typeof account.amount).toStrictEqual('string') // 10.00000000@DFI
      }
    })

    it('should listAccounts with verbose false and indexed_amounts true', async () => {
      await waitForListingAccounts()

      const accounts = await client.account.listAccounts({}, false, { indexedAmounts: true, isMineOnly: false })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toStrictEqual('string')
        expect(typeof account.owner).toStrictEqual('string')

        expect(typeof account.amount === 'object').toStrictEqual(true)
        for (const k in account.amount) {
          expect(account.amount[k] instanceof BigNumber).toStrictEqual(true) // [{'0': 100}]
        }
      }
    })

    it('should listAccounts with verbose true and indexed_amounts true', async () => {
      await waitForListingAccounts()

      const accounts = await client.account.listAccounts({}, true, { indexedAmounts: true, isMineOnly: false })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toStrictEqual('string')
        expect(typeof account.owner === 'object').toStrictEqual(true)
        expect(typeof account.owner.asm).toStrictEqual('string')
        expect(account.owner.reqSigs instanceof BigNumber).toStrictEqual(true)
        expect(typeof account.owner.type).toStrictEqual('string')
        expect(account.owner.addresses.length).toBeGreaterThan(0)

        expect(typeof account.amount === 'object').toStrictEqual(true)
        for (const k in account.amount) {
          expect(account.amount[k] instanceof BigNumber).toStrictEqual(true) // [{'0': 100}]
        }
      }
    })

    it('should listAccounts with verbose true and indexed_amounts false', async () => {
      await waitForListingAccounts()

      const accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toStrictEqual('string')
        expect(typeof account.owner === 'object').toStrictEqual(true)
        expect(typeof account.owner.asm).toStrictEqual('string')
        expect(account.owner.reqSigs instanceof BigNumber).toStrictEqual(true)
        expect(typeof account.owner.type).toStrictEqual('string')
        expect(account.owner.addresses.length).toBeGreaterThan(0)
        expect(typeof account.amount).toStrictEqual('string') // 10.00000000@DFI
      }
    })

    it('should listAccounts with isMineOnly true', async () => {
      await waitForListingAccounts()

      const accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: true })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toStrictEqual('string')
        expect(typeof account.owner === 'object').toStrictEqual(true)
        expect(typeof account.owner.asm).toStrictEqual('string')
        expect(account.owner.reqSigs instanceof BigNumber).toStrictEqual(true)
        expect(typeof account.owner.type).toStrictEqual('string')
        expect(account.owner.addresses.length).toBeGreaterThan(0)
        expect(typeof account.amount).toStrictEqual('string') // 10.00000000@DFI
      }
    })
  })
})
