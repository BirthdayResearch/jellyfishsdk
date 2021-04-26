import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { AccountOwner, AccountAmount, TokenBalances } from '../../src'

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
    const address = await utxosToAccount()

    const symbol = 'DLITE'
    await createToken(symbol)
    await accountToAccount(address, symbol)
  }

  async function utxosToAccount (): Promise<string> {
    const address = await container.call('getnewaddress')

    const payload: { [key: string]: string } = {}
    payload[address] = '300@0'
    await container.call('utxostoaccount', [payload])

    await container.generate(1)
    await container.call('clearmempool')

    return address
  }

  async function createToken (symbol: string): Promise<void> {
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
    await container.generate(1)
    await container.call('clearmempool')

    await container.call('minttokens', [`500@${symbol}`])
    await container.generate(1)
    await container.call('clearmempool')
  }

  async function accountToAccount (from: string, symbol: string): Promise<void> {
    const to = await container.call('getnewaddress')

    await container.call('accounttoaccount', [from, { [to]: `5@${symbol}` }])

    await container.generate(1)
    await container.call('clearmempool')
  }

  describe.only('listAccounts', () => {
    it('should listAccounts', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const accounts = await client.account.listAccounts()
      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof (account.owner as AccountOwner).asm).toBe('string')
        expect(typeof (account.owner as AccountOwner).reqSigs).toBe('number')
        expect((account.owner as AccountOwner).type).toBe('scripthash')
        expect((account.owner as AccountOwner).addresses.length).toBeGreaterThan(0)
        expect(typeof account.amount).toBe('string') // eg: 10.00000000@DFI
      }
    })

    it('should listAccounts with pagination start and including_start', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts<AccountOwner, string>()
        console.log('accounts: ', accounts)
        expect(accounts.length).toBeGreaterThan(0)
      })

      const pagination = {
        start: accounts[2].owner.key,
        including_start: true
      }

      accounts = await client.account.listAccounts<AccountOwner, string>(pagination)
      console.log('accounts 2: ', accounts)

      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof account.owner.asm).toBe('string')
        expect(typeof account.owner.reqSigs).toBe('number')
        expect(account.owner.type).toBe('scripthash')
        expect(account.owner.addresses.length).toBeGreaterThan(0)
        expect(typeof account.amount).toBe('string') // eg: 10.00000000@DFI
      }
    })

    it('should listAccounts with pagination.limit', async () => {
      await waitForExpect(async () => {
        const pagination = {
          limit: 2
        }
        const accounts = await client.account.listAccounts<AccountOwner, string>(pagination)
        expect(accounts.length).toBe(2)
      })
    })

    it('should listAccounts with verbose false', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts<string, string>()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const accounts = await client.account.listAccounts<string, string>({}, false)
      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner).toBe('string')
        expect(typeof account.amount).toBe('string') // eg: 10.00000000@DFI
      }
    })

    it('should listAccounts with indexed_amounts true', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts<AccountOwner, string>()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const options = {
        indexedAmounts: true
      }

      const accounts = await client.account.listAccounts<AccountOwner, AccountAmount>({}, true, options)
      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof (account.owner).asm).toBe('string')
        expect(typeof (account.owner).reqSigs).toBe('number')
        expect(account.owner.type).toBe('scripthash')
        expect(account.owner.addresses.length).toBeGreaterThan(0)

        expect(typeof account.amount === 'object').toBe(true)
        expect(typeof account.amount['0']).toBe('string')
      }
    })

    it('should listAccounts with isMineOnly true', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts<AccountOwner, string>()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const options = {
        isMineOnly: true
      }

      const accounts = await client.account.listAccounts<AccountOwner, string>({}, true, options)
      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof (account.owner).asm).toBe('string')
        expect(typeof (account.owner).reqSigs).toBe('number')
        expect((account.owner).type).toBe('scripthash')
        expect((account.owner).addresses.length).toBeGreaterThan(0)

        expect(typeof account.amount).toBe('string') // eg: 10.00000000@DFI
      }
    })
  })

  describe.skip('getAccount', () => {
    it('should getAccount', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts()
        expect(accounts.length).toBeGreaterThan(0)
      })
      console.log('accounts: ', accounts)

      const account = await client.account.getAccount(accounts[0].owner.addresses[0])
      console.log('account: ', account)
      // expect(account.length).toBeGreaterThan(0)
      // expect(account[0]).toBe('10.00000000@DFI')
    })

    it('should getAccount with pagination start and including_start', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const pagination = {
        start: accounts[0].owner.key,
        including_start: true
      }

      const account = await client.account.getAccount(accounts[0].owner.addresses[0], pagination)
      console.log('account 1: ', account)

      expect(account.length).toBeGreaterThan(0)
      expect(account[0]).toBe('10.00000000@DFI')
    })

    it('should getAccount with pagination.limit', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const pagination = {
        limit: 2
      }
      const account = await client.account.getAccount(accounts[0].owner.addresses[0], pagination)
      console.log('account 2: ', account)
    })

    it('should getAccount with indexedAmount true', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const options = {
        indexedAmounts: true
      }

      const account = await client.account.getAccount(accounts[0].owner.addresses[0], {}, options)
      console.log('account 3: ', account)
      expect(typeof account).toBe('object')
      expect(typeof account[0]).toBe('number')
    })
  })

  describe.skip('getTokenBalances', () => {
    it('should getTokenBalances', async () => {
      await waitForExpect(async () => {
        const tokenBalances: number[] = await client.account.getTokenBalances()
        console.log('tokenBalances: ', tokenBalances)
        expect(tokenBalances.length).toBeGreaterThan(0)
        expect(tokenBalances[0]).toBe(60)
      })
    })

    it('should getTokenBalances with pagination start and including_start', async () => {
      await waitForExpect(async () => {
        const pagination = {
          start: '',
          including_start: true
        }
        const tokenBalances: number[] = await client.account.getTokenBalances(pagination)
        console.log('tokenBalances: ', tokenBalances)
        // expect(tokenBalances.length).toBeGreaterThan(0)
        // expect(tokenBalances[0]).toBe(0)
      })
    })

    it('should getTokenBalances with pagination limit', async () => {
      await waitForExpect(async () => {
        const pagination = {
          limit: 2
        }
        const tokenBalances: number[] = await client.account.getTokenBalances(pagination)
        console.log('tokenBalances: ', tokenBalances)
        // expect(tokenBalances.length).toBeGreaterThan(0)
        // expect(tokenBalances[0]).toBe(0)
      })
    })

    it('should getTokenBalances with indexedAmounts true', async () => {
      await waitForExpect(async () => {
        const tokenBalances: TokenBalances = await client.account.getTokenBalances({}, true)
        console.log('tokenBalances: ', tokenBalances)
        expect(typeof tokenBalances === 'object').toBe(true)
        expect(tokenBalances['0']).toBe(60)
      })
    })

    it('should getTokenBalances with symbolLookup', async () => {
      await waitForExpect(async () => {
        const options = {
          symbolLookup: true
        }
        const tokenBalances: string[] = await client.account.getTokenBalances({}, false, options)
        console.log('tokenBalances: ', tokenBalances)
        expect(tokenBalances.length).toBeGreaterThan(0)
        expect(tokenBalances[0]).toBe('60.00000000@DFI')
      })
    })
  })

  describe.skip('listAccountHistory', () => {
    it('should listAccountHistory', async () => {
      await waitForExpect(async () => {
        const accountHistories = await client.account.listAccountHistory()
        console.log('accountHistories: ', accountHistories.length)
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
        console.log('accountHistories: ', accountHistories)
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
      await waitForExpect(async () => {
        const accountHistories = await client.account.listAccountHistory()
        expect(accountHistories.length).toBeGreaterThan(0)

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
    })

    it('should listAccountHistory with owner address', async () => {
      await waitForExpect(async () => {
        const accountHistories = await client.account.listAccountHistory()
        expect(accountHistories.length).toBeGreaterThan(0)

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
    })

    it('should listAccountHistory with options maxBlockHeight', async () => {
      await waitForExpect(async () => {
        const options = {
          maxBlockHeight: 100
        }

        const accountHistories = await client.account.listAccountHistory('mine', options)
        expect(accountHistories.length).toBeGreaterThan(0)

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
    })

    it('should listAccountHistory with options depth', async () => {
      await waitForExpect(async () => {
        const options = {
          depth: 1
        }

        const accountHistories = await client.account.listAccountHistory('mine', options)
        expect(accountHistories.length).toBeGreaterThan(0)

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
    })

    it('should listAccountHistory with options no_rewards', async () => {
      await waitForExpect(async () => {
        const options = {
          no_rewards: true
        }

        const accountHistories = await client.account.listAccountHistory('mine', options)
        expect(accountHistories.length).toBeGreaterThan(0)

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
    })

    it('should listAccountHistory with options token', async () => {
      await waitForExpect(async () => {
        const options = {
          token: ''
        }

        const accountHistories = await client.account.listAccountHistory('mine', options)
        expect(accountHistories.length).toBeGreaterThan(0)

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
    })

    it('should listAccountHistory with options txtype', async () => {
      await waitForExpect(async () => {
        const options = {
          txtype: ''
        }

        const accountHistories = await client.account.listAccountHistory('mine', options)
        expect(accountHistories.length).toBeGreaterThan(0)

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
