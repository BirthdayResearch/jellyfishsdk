import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'

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

  describe('getAccount', () => {
    it('should getAccount', async () => {
      const accounts = await waitForListingAccounts()

      // [ '187.00000000@DBTC', '154.00000000@DETH' ]
      const account = await client.account.getAccount(accounts[0].owner.addresses[0])
      expect(account.length).toBeGreaterThan(0)
      for (let i = 0; i < account.length; i += 1) {
        expect(typeof account[i]).toStrictEqual('string')
      }
    })

    it('should getAccount with pagination start and including_start', async () => {
      let accounts: any[] = []
      let beforeAccountCount = 0

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts()
        expect(accounts.length).toBeGreaterThan(0)

        const account = await client.account.getAccount(accounts[0].owner.addresses[0])
        beforeAccountCount = account.length
      })

      const pagination = {
        start: beforeAccountCount,
        including_start: true
      }

      // [ '187.00000000@DBTC', '154.00000000@DETH' ]
      const account = await client.account.getAccount(accounts[0].owner.addresses[0], pagination)
      expect(account.length).toStrictEqual(1)

      for (let i = 0; i < account.length; i += 1) {
        expect(typeof account[i]).toStrictEqual('string')
      }
    })

    it('should getAccount with pagination.limit', async () => {
      const accounts = await waitForListingAccounts()

      const pagination = {
        limit: 1
      }
      const account = await client.account.getAccount(accounts[0].owner.addresses[0], pagination)
      expect(account.length).toStrictEqual(1)
    })

    it('should getAccount with indexedAmount true', async () => {
      const accounts = await waitForListingAccounts()

      const account = await client.account.getAccount(accounts[0].owner.addresses[0], {}, { indexedAmounts: true })
      expect(typeof account).toStrictEqual('object')
      for (const k in account) {
        expect(typeof account[k]).toStrictEqual('number')
      }
    })
  })
})
