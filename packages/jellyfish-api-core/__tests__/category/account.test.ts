import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import BigNumber from 'bignumber.js'
import { UtxosToAccountPayload, AccountHistoryCountOptions } from '../../src/category/account'

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
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof account.owner.asm).toBe('string')
        expect(account.owner.reqSigs instanceof BigNumber).toBe(true)
        expect(typeof account.owner.type).toBe('string')
        expect(account.owner.addresses.length).toBeGreaterThan(0)
        expect(typeof account.amount).toBe('string') // 10.00000000@DFI
      }
    })

    it('should listAccounts with pagination start and including_start', async () => {
      const accounts = await waitForListingAccounts()

      const pagination = {
        start: accounts[accounts.length - 1].key,
        including_start: true
      }

      const lastAccounts = await client.account.listAccounts(pagination)
      expect(lastAccounts.length).toBe(1)
    })

    it('should listAccounts with pagination.limit', async () => {
      await waitForExpect(async () => {
        const pagination = {
          limit: 2
        }
        const accounts = await client.account.listAccounts(pagination)
        expect(accounts.length).toBe(2)
      })
    })

    it('should listAccounts with verbose false and indexed_amounts false', async () => {
      await waitForListingAccounts()

      const accounts = await client.account.listAccounts({}, false, { indexedAmounts: false, isMineOnly: false })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner).toBe('string')
        expect(typeof account.amount).toBe('string') // 10.00000000@DFI
      }
    })

    it('should listAccounts with verbose false and indexed_amounts true', async () => {
      await waitForListingAccounts()

      const accounts = await client.account.listAccounts({}, false, { indexedAmounts: true, isMineOnly: false })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner).toBe('string')

        expect(typeof account.amount === 'object').toBe(true)
        for (const k in account.amount) {
          expect(account.amount[k] instanceof BigNumber).toBe(true) // [{'0': 100}]
        }
      }
    })

    it('should listAccounts with verbose true and indexed_amounts true', async () => {
      await waitForListingAccounts()

      const accounts = await client.account.listAccounts({}, true, { indexedAmounts: true, isMineOnly: false })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof account.owner.asm).toBe('string')
        expect(account.owner.reqSigs instanceof BigNumber).toBe(true)
        expect(typeof account.owner.type).toBe('string')
        expect(account.owner.addresses.length).toBeGreaterThan(0)

        expect(typeof account.amount === 'object').toBe(true)
        for (const k in account.amount) {
          expect(account.amount[k] instanceof BigNumber).toBe(true) // [{'0': 100}]
        }
      }
    })

    it('should listAccounts with verbose true and indexed_amounts false', async () => {
      await waitForListingAccounts()

      const accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: false })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof account.owner.asm).toBe('string')
        expect(account.owner.reqSigs instanceof BigNumber).toBe(true)
        expect(typeof account.owner.type).toBe('string')
        expect(account.owner.addresses.length).toBeGreaterThan(0)
        expect(typeof account.amount).toBe('string') // 10.00000000@DFI
      }
    })

    it('should listAccounts with isMineOnly true', async () => {
      await waitForListingAccounts()

      const accounts = await client.account.listAccounts({}, true, { indexedAmounts: false, isMineOnly: true })

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof account.owner.asm).toBe('string')
        expect(account.owner.reqSigs instanceof BigNumber).toBe(true)
        expect(typeof account.owner.type).toBe('string')
        expect(account.owner.addresses.length).toBeGreaterThan(0)
        expect(typeof account.amount).toBe('string') // 10.00000000@DFI
      }
    })
  })

  describe('getAccount', () => {
    it('should getAccount', async () => {
      const accounts = await waitForListingAccounts()

      // [ '187.00000000@DBTC', '154.00000000@DETH' ]
      const account = await client.account.getAccount(accounts[0].owner.addresses[0])
      expect(account.length).toBeGreaterThan(0)
      for (let i = 0; i < account.length; i += 1) {
        expect(typeof account[i]).toBe('string')
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
      expect(account.length).toBe(1)

      for (let i = 0; i < account.length; i += 1) {
        expect(typeof account[i]).toBe('string')
      }
    })

    it('should getAccount with pagination.limit', async () => {
      const accounts = await waitForListingAccounts()

      const pagination = {
        limit: 1
      }
      const account = await client.account.getAccount(accounts[0].owner.addresses[0], pagination)
      expect(account.length).toBe(1)
    })

    it('should getAccount with indexedAmount true', async () => {
      const accounts = await waitForListingAccounts()

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
        const tokenBalances = await client.account.getTokenBalances()
        expect(tokenBalances.length).toBeGreaterThan(0)
      })

      const tokenBalances = await client.account.getTokenBalances()
      for (let i = 0; i < tokenBalances.length; i += 1) {
        expect(typeof tokenBalances[i]).toBe('string') // [ '300.00000000@0', '200.00000000@1' ]
      }
    })

    it('should getTokenBalances with pagination start and including_start', async () => {
      let id = ''

      await waitForExpect(async () => {
        const tokenBalances = await client.account.getTokenBalances() // [ '300.00000000@0', '200.00000000@1' ]
        expect(tokenBalances.length).toBeGreaterThan(0)

        id = tokenBalances[tokenBalances.length - 1].split('@')[1]
      })

      const pagination = {
        start: Number(id),
        including_start: true
      }
      const tokenBalances = await client.account.getTokenBalances(pagination)
      expect(tokenBalances.length).toBe(1)
    })

    it('should getTokenBalances with pagination limit', async () => {
      await waitForExpect(async () => {
        const tokenBalances = await client.account.getTokenBalances()
        expect(tokenBalances.length).toBe(2)
      })
      const pagination = {
        limit: 1
      }
      const tokenBalances = await client.account.getTokenBalances(pagination)
      expect(tokenBalances.length).toBe(1)
    })

    it('should getTokenBalances with indexedAmounts true', async () => {
      await waitForExpect(async () => {
        const tokenBalances = await client.account.getTokenBalances({}, true, { symbolLookup: false })
        expect(typeof tokenBalances === 'object').toBe(true)
        for (const k in tokenBalances) {
          expect(tokenBalances[k] instanceof BigNumber).toBe(true)
        }
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
        expect(typeof accountHistory.type).toBe('string')
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
      const accounts = await waitForListingAccounts()

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
        const height = await container.getBlockCount()
        const accountHistories = await client.account.listAccountHistory('mine', { depth })

        for (const accountHistory of accountHistories) {
          expect(accountHistory.blockHeight).toBeGreaterThanOrEqual(height - depth)
        }
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

    it('should listAccountHistory with options txtype', async () => {
      await waitForExpect(async () => {
        const accountHistories = await client.account.listAccountHistory('mine', { txtype: 'M' })
        expect(accountHistories.length).toBeGreaterThan(0)
      })

      const accountHistories = await client.account.listAccountHistory('mine', { txtype: 'M' })
      for (let i = 0; i < accountHistories.length; i += 1) {
        const accountHistory = accountHistories[i]
        expect(accountHistory.type).toBe('MintToken')
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

  describe('utxosToAccount', () => {
    it('should utxosToAccount', async () => {
      const payload: UtxosToAccountPayload = {}
      // NOTE(jingyi2811): Only support sending utxos to DFI account.
      payload[await container.getNewAddress()] = '5@DFI'
      payload[await container.getNewAddress()] = '5@DFI'

      const data = await client.account.utxosToAccount(payload)

      expect(typeof data).toBe('string')
      expect(data.length).toBe(64)
    })

    it('should utxosToAccount with utxos', async () => {
      const payload: UtxosToAccountPayload = {}
      // NOTE(jingyi2811): Only support sending utxos to DFI account.
      payload[await container.getNewAddress()] = '5@DFI'
      payload[await container.getNewAddress()] = '5@DFI'

      const utxos = await container.call('listunspent')
      const inputs = utxos.map((utxo: { txid: string, vout: number }) => {
        return {
          txid: utxo.txid,
          vout: utxo.vout
        }
      })

      const data = await client.account.utxosToAccount(payload, inputs)

      expect(typeof data).toBe('string')
      expect(data.length).toBe(64)
    })
  })

  describe('accountHistoryCount', () => {
    it('should get accountHistoryCount', async () => {
      await waitForExpect(async () => {
        const accountHistoryCount = await client.account.accountHistoryCount()

        expect(typeof accountHistoryCount).toBe('number')
        expect(accountHistoryCount).toBeGreaterThan(0)
      })
    })

    it('should get accountHistoryCount with owner as all', async () => {
      await waitForExpect(async () => {
        const count = await client.account.accountHistoryCount('all')

        expect(typeof count).toBe('number')
        expect(count).toBeGreaterThan(0)
      })
    })

    it('should get accountHistoryCount with no_rewards option', async () => {
      await waitForExpect(async () => {
        const options: AccountHistoryCountOptions = {
          no_rewards: true
        }
        const count = await client.account.accountHistoryCount('mine', options)

        expect(typeof count).toBe('number')
        expect(count).toBeGreaterThan(0)
      })
    })

    it('should get accountHistoryCount with token option', async () => {
      await waitForExpect(async () => {
        const options: AccountHistoryCountOptions = {
          token: 'DBTC'
        }
        const count = await client.account.accountHistoryCount('mine', options)

        expect(typeof count).toBe('number')
        expect(count).toBeGreaterThan(0)
      })
    })

    it('should get accountHistory with txtype option', async () => {
      await waitForExpect(async () => {
        const options: AccountHistoryCountOptions = {
          txtype: 'M'
        }
        const count = await client.account.accountHistoryCount('mine', options)

        expect(typeof count).toBe('number')
        expect(count).toBeGreaterThan(0)
      })
    })
  })
})
