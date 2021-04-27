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

    const symbol = 'DBTC'
    const address = await createToken(symbol, 200)
    await accountToAccount(symbol, 5, address)
  }

  async function utxosToAccount (amount: number): Promise<void> {
    const address = await container.call('getnewaddress')

    const payload: { [key: string]: string } = {}
    payload[address] = `${amount.toString()}@0`
    await container.call('utxostoaccount', [payload])
    await container.generate(25)
  }

  async function createToken (symbol: string, amount: number): Promise<string> {
    const address = await container.call('getnewaddress')
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

    return address
  }

  async function accountToAccount (symbol: string, amount: number, from: string): Promise<void> {
    const to = await container.call('getnewaddress')

    await container.call('accounttoaccount', [from, { [to]: `${amount.toString()}@${symbol}` }])

    await container.generate(25)
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

    // TODO(canonbrother): the index seems not working, total records 3, offset 2 expect 1 but return 3
    it.skip('should listAccounts with pagination start and including_start', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })
        expect(accounts.length).toBeGreaterThan(0)
      })

      const pagination = {
        start: accounts[1].owner.key,
        including_start: true
      }

      accounts = await client.account.listAccounts(pagination, true, { indexedAmounts: false, isMineOnly: false })

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

      const account = await client.account.getAccount(accounts[0].owner.addresses[0], {}, { indexedAmounts: false })
      expect(account.length).toBeGreaterThan(0)
      expect(typeof account[0]).toBe('string') // 10.00000000@DFI'
    })

    // TODO(canonbrother): assume the pagination on test only works while getAccount return [amountA, amountB] but [amountA]
    it.skip('should getAccount with pagination start and including_start', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })
        expect(accounts.length).toBeGreaterThan(0)
      })

      const pagination = {
        start: accounts[0].owner.key,
        including_start: true
      }

      const account = await client.account.getAccount(accounts[0].owner.addresses[0], pagination, { indexedAmounts: false })
      expect(account.length).toBeGreaterThan(0)
      expect(typeof account[0]).toBe('string') // 10.00000000@DFI
    })

    // TODO(canonbrother): assume the pagination on test only works while getAccount return [amountA, amountB] but [amountA]
    it.skip('should getAccount with pagination.limit', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })
        expect(accounts.length).toBeGreaterThan(0)
      })

      const pagination = {
        limit: 2
      }
      const account = await client.account.getAccount(accounts[0].owner.addresses[0], pagination, { indexedAmounts: false })
      expect(account.length).toBe(2)
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
        const tokenBalances: number[] = await client.account.getTokenBalances({}, false, { symbolLookup: false })
        expect(tokenBalances.length).toBeGreaterThan(0)
      })

      const tokenBalances: number[] = await client.account.getTokenBalances({}, false, { symbolLookup: false })
      for (let i = 0; i < tokenBalances.length; i += 1) {
        expect(typeof tokenBalances[i]).toBe('string') // [ '300.00000000@0', '200.00000000@1' ]
      }
    })

    it.skip('should getTokenBalances with pagination start and including_start', async () => {
      await waitForExpect(async () => {
        const pagination = {
          start: '',
          including_start: true
        }
        const tokenBalances: number[] = await client.account.getTokenBalances(pagination, false, { symbolLookup: false })
        console.log('tokenBalances: ', tokenBalances)
      })
    })

    it('should getTokenBalances with pagination limit', async () => {
      await waitForExpect(async () => {
        const tokenBalances: number[] = await client.account.getTokenBalances({}, false, { symbolLookup: false })
        expect(tokenBalances.length).toBe(2)
      })
      const pagination = {
        limit: 1
      }
      const tokenBalances: number[] = await client.account.getTokenBalances(pagination, false, { symbolLookup: false })
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
        const tokenBalances: string[] = await client.account.getTokenBalances({}, false, { symbolLookup: true })
        expect(tokenBalances.length).toBeGreaterThan(0)
      })

      const tokenBalances: string[] = await client.account.getTokenBalances({}, false, { symbolLookup: true })
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

    // TODO(canonbrother): generate CScript
    it.skip('should listAccountHistory with owner CScript', async () => {
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
        expect(typeof accountHistory.type).toBe('string') // UtxosToAccount
        expect(typeof accountHistory.txn).toBe('number')
        expect(typeof accountHistory.txid).toBe('string')
        expect(accountHistory.amounts.length).toBeGreaterThan(0)
        expect(typeof accountHistory.amounts[0]).toBe('number')
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

    // TODO(canonbrother): check the confirmation??
    it.skip('should listAccountHistory with options depth', async () => {
      const options = {
        depth: 6
      }
      await waitForExpect(async () => {
        const accountHistories = await client.account.listAccountHistory('mine', options)
        console.log('accountHistories: ', accountHistories)
        expect(accountHistories.length).toBeGreaterThan(0)
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

    // TODO(canonbrother): filter by txtype but its not working
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
