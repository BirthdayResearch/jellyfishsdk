import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(300)

    await setup()
  })

  afterAll(async () => {
    await container.stop()
  })

  async function setup (): Promise<void> {
    await utxosToAccount(50)
    await utxosToAccount(60)
    await utxosToAccount(190)

    const from = await container.call('getnewaddress')
    await createToken(from, 'DBTC', 200)

    const to = await accountToAccount('DBTC', 5, from)
    await accountToAccount('DBTC', 18, from, to)

    await createToken(from, 'DETH', 200)
    await accountToAccount('DETH', 46, from)
  }

  async function utxosToAccount (amount: number): Promise<void> {
    const address = await container.call('getnewaddress')

    const payload: { [key: string]: string } = {}
    payload[address] = `${amount.toString()}@0`
    await container.generate(25)
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
    await container.call('createtoken', [metadata])
    await container.generate(25)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(25)
  }

  async function accountToAccount (symbol: string, amount: number, from: string, _to = ''): Promise<string> {
    const to = _to !== '' ? _to : await container.call('getnewaddress')

    await container.call('accounttoaccount', [from, { [to]: `${amount.toString()}@${symbol}` }])
    await container.generate(25)

    return to
  }

  describe('listAccounts', () => {
    it('should listAccounts', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })
        expect(accounts.length).toBeGreaterThan(0)
      })

      const accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof account.owner.asm).toBe('string')
        expect(typeof account.owner.reqSigs).toBe('number')
        expect(account.owner.type).toBe('scripthash')
        expect(account.owner.addresses.length).toBeGreaterThan(0)
        expect(typeof account.amount).toBe('string') // 10.00000000@DFI
      }
    })

    it('should listAccounts with pagination start and including_start', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })
        expect(accounts.length).toBeGreaterThan(0)
      })

      const pagination = {
        start: accounts[accounts.length - 1].key,
        including_start: true
      }

      const lastAccounts = await client.account.listAccounts(pagination, true, { indexedAmounts: false, isMineOnly: false })
      expect(lastAccounts.length).toBe(1)
    })

    it('should listAccounts with pagination.limit', async () => {
      await waitForExpect(async () => {
        const pagination = {
          limit: 2
        }
        const accounts = await client.account.listAccounts(pagination, true, { indexedAmounts: false, isMineOnly: false })
        expect(accounts.length).toBe(2)
      })
    })

    it('should listAccounts with verbose false', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts({}, false, { indexedAmounts: false, isMineOnly: false })

        expect(accounts.length).toBeGreaterThan(0)
      })

      const accounts = await client.account.listAccounts({}, false, { indexedAmounts: false, isMineOnly: false })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner).toBe('string')
        expect(typeof account.amount).toBe('string') // 10.00000000@DFI
      }
    })

    it('should listAccounts with indexed_amounts true', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts({}, false, { indexedAmounts: false, isMineOnly: false })

        expect(accounts.length).toBeGreaterThan(0)
      })

      const accounts = await client.account.listAccounts({}, true, { indexedAmounts: true, isMineOnly: false })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof (account.owner).asm).toBe('string')
        expect(typeof (account.owner).reqSigs).toBe('number')
        expect(account.owner.type).toBe('scripthash')
        expect(account.owner.addresses.length).toBeGreaterThan(0)

        expect(typeof account.amount === 'object').toBe(true)
        for (const k in account.amount) {
          expect(typeof account.amount[k]).toBe('number') // [{'0': 100}]
        }
      }
    })

    it('should listAccounts with isMineOnly true', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: true })

        expect(accounts.length).toBeGreaterThan(0)
      })

      const accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: true })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof (account.owner).asm).toBe('string')
        expect(typeof (account.owner).reqSigs).toBe('number')
        expect((account.owner).type).toBe('scripthash')
        expect((account.owner).addresses.length).toBeGreaterThan(0)
        expect(typeof account.amount).toBe('string') // 10.00000000@DFI
      }
    })
  })

  describe('getAccount', () => {
    it('should getAccount', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })
        expect(accounts.length).toBeGreaterThan(0)
      })

      const account = await client.account.getAccount(accounts[0].owner.addresses[0], {}, { indexedAmounts: false }) // [ '187.00000000@DBTC', '154.00000000@DETH' ]
      expect(account.length).toBeGreaterThan(0)
      for (let i = 0; i < account.length; i += 1) {
        expect(typeof account[i]).toBe('string')
      }
    })

    it('should getAccount with pagination start and including_start', async () => {
      let accounts: any[] = []
      let beforeAccountCount = 0

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })
        expect(accounts.length).toBeGreaterThan(0)

        const account = await client.account.getAccount(accounts[0].owner.addresses[0], {}, { indexedAmounts: false })
        beforeAccountCount = account.length
      })

      const pagination = {
        start: beforeAccountCount,
        including_start: true
      }

      const account = await client.account.getAccount(accounts[0].owner.addresses[0], pagination, { indexedAmounts: false })
      expect(account.length).toBeGreaterThan(beforeAccountCount - 1)
      for (let i = 0; i < account.length; i += 1) {
        expect(typeof account[i]).toBe('string')
      }
    })

    it('should getAccount with pagination.limit', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })
        expect(accounts.length).toBeGreaterThan(0)
      })

      const pagination = {
        limit: 1
      }
      const account = await client.account.getAccount(accounts[0].owner.addresses[0], pagination, { indexedAmounts: false })
      expect(account.length).toBe(1)
    })

    it('should getAccount with indexedAmount true', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })
        expect(accounts.length).toBeGreaterThan(0)
      })

      const account = await client.account.getAccount(accounts[0].owner.addresses[0], {}, { indexedAmounts: true })
      expect(typeof account).toBe('object')
      for (const k in account) {
        expect(typeof account[k]).toBe('number')
      }
    })
  })

  describe('getTokenBalances', () => {
    it('should getTokenBalances', async () => {
      await waitForExpect(async () => {
        const tokenBalances = await client.account.getTokenBalances({}, false, { symbolLookup: false })
        expect(tokenBalances.length).toBeGreaterThan(0)
      })

      const tokenBalances = await client.account.getTokenBalances({}, false, { symbolLookup: false })
      for (let i = 0; i < tokenBalances.length; i += 1) {
        expect(typeof tokenBalances[i]).toBe('string') // [ '300.00000000@0', '200.00000000@1' ]
      }
    })

    it('should getTokenBalances with pagination start and including_start, id is number', async () => {
      let id = ''

      await waitForExpect(async () => {
        const tokenBalances = await client.account.getTokenBalances({}, false, { symbolLookup: false }) // [ '300.00000000@0', '200.00000000@1' ]
        expect(tokenBalances.length).toBeGreaterThan(0)

        id = tokenBalances[tokenBalances.length - 1].split('@')[1]
      })

      const pagination = {
        start: Number(id),
        including_start: true
      }
      const tokenBalances = await client.account.getTokenBalances(pagination, false, { symbolLookup: false })
      expect(tokenBalances.length).toBe(1)
    })

    it('should getTokenBalances with pagination limit', async () => {
      await waitForExpect(async () => {
        const tokenBalances = await client.account.getTokenBalances({}, false, { symbolLookup: false })
        expect(tokenBalances.length).toBe(2)
      })
      const pagination = {
        limit: 1
      }
      const tokenBalances = await client.account.getTokenBalances(pagination, false, { symbolLookup: false })
      expect(tokenBalances.length).toBe(1)
    })

    it('should getTokenBalances with indexedAmounts true', async () => {
      await waitForExpect(async () => {
        const tokenBalances = await client.account.getTokenBalances({}, true, { symbolLookup: false })
        expect(typeof tokenBalances === 'object').toBe(true)
      })
    })

    it('should getTokenBalances with symbolLookup', async () => {
      await waitForExpect(async () => {
        const tokenBalances = await client.account.getTokenBalances({}, false, { symbolLookup: true })
        expect(tokenBalances.length).toBeGreaterThan(0)
      })

      const tokenBalances = await client.account.getTokenBalances({}, false, { symbolLookup: true })
      for (let i = 0; i < tokenBalances.length; i += 1) {
        expect(typeof tokenBalances[i]).toBe('string') // [ '300.00000000@DFI', '200.00000000@DBTC' ]
      }
    })
  })

  describe('listAccountHistory', () => {
    it('should listAccountHistory', async () => {
      await waitForExpect(async () => {
        const accountHistories = await client.account.listAccountHistory()
        expect(accountHistories.length).toBeGreaterThan(0)
      })

      const accountHistories = await client.account.listAccountHistory()

      for (let i = 0; i < accountHistories.length; i += 1) {
        const accountHistory = accountHistories[i]
        expect(typeof accountHistory.owner).toBe('string')
        expect(typeof accountHistory.blockHeight).toBe('number')
        expect(typeof accountHistory.blockHash).toBe('string')
        expect(typeof accountHistory.blockTime).toBe('number')
        expect(typeof accountHistory.type).toBe('string') // UtxosToAccount, sent, receive
        expect(typeof accountHistory.txn).toBe('number')
        expect(typeof accountHistory.txid).toBe('string')
        expect(accountHistory.amounts.length).toBeGreaterThan(0)
        expect(typeof accountHistory.amounts[0]).toBe('string') // [ '10.00000000@DFI' ]
      }
    })

    it('should listAccountHistory with owner "all"', async () => {
      await waitForExpect(async () => {
        const accountHistories = await client.account.listAccountHistory('all')
        expect(accountHistories.length).toBeGreaterThan(0)
      })

      const accountHistories = await client.account.listAccountHistory('all')

      for (let i = 0; i < accountHistories.length; i += 1) {
        const accountHistory = accountHistories[i]
        expect(typeof accountHistory.owner).toBe('string')
        expect(typeof accountHistory.blockHeight).toBe('number')
        expect(typeof accountHistory.blockHash).toBe('string')
        expect(typeof accountHistory.blockTime).toBe('number')
        expect(typeof accountHistory.type).toBe('string')
        expect(typeof accountHistory.txn).toBe('number')
        expect(typeof accountHistory.txid).toBe('string')
        expect(accountHistory.amounts.length).toBeGreaterThan(0)
        expect(typeof accountHistory.amounts[0]).toBe('string')
      }
    })

    it('should listAccountHistory with owner CScript', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })
        expect(accounts.length).toBeGreaterThan(0)
      })

      const { owner } = accounts[0]
      const { hex, addresses } = owner

      const accountHistories = await client.account.listAccountHistory(hex)

      for (let i = 0; i < accountHistories.length; i += 1) {
        const accountHistory = accountHistories[i]
        expect(addresses.includes(accountHistory.owner)).toBe(true)
      }
    })

    it('should listAccountHistory with owner address', async () => {
      let address = ''

      await waitForExpect(async () => {
        const accountHistories = await client.account.listAccountHistory()
        expect(accountHistories.length).toBeGreaterThan(0)
        address = accountHistories[0].owner
      })

      const accountHistories = await client.account.listAccountHistory(address)
      for (let i = 0; i < accountHistories.length; i += 1) {
        const accountHistory = accountHistories[i]
        expect(accountHistory.owner).toBe(address)
      }
    })

    it('should listAccountHistory with options maxBlockHeight', async () => {
      const options = {
        maxBlockHeight: 80
      }
      await waitForExpect(async () => {
        const accountHistories = await client.account.listAccountHistory('mine', options)
        expect(accountHistories.length).toBeGreaterThan(0)
      })

      const accountHistories = await client.account.listAccountHistory('mine', options)
      for (let i = 0; i < accountHistories.length; i += 1) {
        const accountHistory = accountHistories[i]
        expect(accountHistory.blockHeight).toBeLessThanOrEqual(80)
      }
    })

    it('should listAccountHistory with options depth', async () => {
      await waitForExpect(async () => {
        const depth = 10
        const accountHistories = await client.account.listAccountHistory('mine', { depth })
        expect(accountHistories.length).toBe(depth + 1) // include zero index
      })
    })

    it('should listAccountHistory with options no_rewards', async () => {
      const options = {
        no_rewards: true
      }
      await waitForExpect(async () => {
        const accountHistories = await client.account.listAccountHistory('mine', options)
        expect(accountHistories.length).toBeGreaterThan(0)
      })

      const accountHistories = await client.account.listAccountHistory('mine', options)
      for (let i = 0; i < accountHistories.length; i += 1) {
        const accountHistory = accountHistories[i]
        expect(accountHistory.txn).not.toBe('blockReward')
      }
    })

    it('should listAccountHistory with options token', async () => {
      const options = {
        token: 'DBTC'
      }
      await waitForExpect(async () => {
        const accountHistories = await client.account.listAccountHistory('mine', options)
        expect(accountHistories.length).toBeGreaterThan(0)
      })

      const accountHistories = await client.account.listAccountHistory('mine', options)
      for (let i = 0; i < accountHistories.length; i += 1) {
        const accountHistory = accountHistories[i]
        expect(accountHistory.amounts.length).toBeGreaterThan(0)
        for (let j = 0; j < accountHistory.amounts.length; j += 1) {
          const amount = accountHistory.amounts[j]
          const symbol = amount.split('@')[1]
          expect(symbol).toBe('DBTC')
        }
      }
    })

    // TODO(canonbrother): require customTx
    it.skip('should listAccountHistory with options txtype', async () => {
      const options = {
        txtype: 'AccountToAccount' // receive, sent, blockreward, AccountToAccount, UtxosToAccount, MintToken
      }
      await waitForExpect(async () => {
        const accountHistories = await client.account.listAccountHistory('mine', options)
        expect(accountHistories.length).toBeGreaterThan(0)
      })

      const accountHistories = await client.account.listAccountHistory('mine', options)
      for (let i = 0; i < accountHistories.length; i += 1) {
        const accountHistory = accountHistories[i]
        expect(accountHistory.type).toBe('AccountToAccount')
      }
    })

    it('should listAccountHistory with options limit', async () => {
      await waitForExpect(async () => {
        const options = {
          limit: 1
        }
        const accountHistories = await client.account.listAccountHistory('mine', options)
        expect(accountHistories.length).toBe(1)
      })
    })
  })
})
