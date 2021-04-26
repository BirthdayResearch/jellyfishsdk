import { RegTestContainer, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { AccountOwner, AccountAmount } from '../../src'

describe('non masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('listAccounts', () => {
    it('should listAccounts', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts()
        console.log('accounts: ', accounts)
      })
    })
  })
})

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  async function utxosToAccount (): Promise<void> {
    const address = await container.call('getnewaddress')
    const payload: { [key: string]: string } = {}
    payload[address] = '100@0'
    await container.call('utxostoaccount', [payload])
    await container.generate(1)
  }

  // async function mintTokens (symbol: string): Promise<void> {

  //   await container.call('minttokens', [`2000@${symbol}`])

  //   await container.generate(1)
  // }

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(300)
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('listAccounts', () => {
    beforeAll(async () => {
      await utxosToAccount()
      await utxosToAccount()
      await utxosToAccount()
    })

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
        expect(account.amount).toBe('100.00000000@DFI')
      }
    })

    it('should listAccounts with pagination start and including_start', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const pagination = {
        start: accounts[0].owner.key,
        including_start: true
      }

      accounts = await client.account.listAccounts(pagination)
      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof (account.owner as AccountOwner).asm).toBe('string')
        expect(typeof (account.owner as AccountOwner).reqSigs).toBe('number')
        expect((account.owner as AccountOwner).type).toBe('scripthash')
        expect((account.owner as AccountOwner).addresses.length).toBeGreaterThan(0)
        expect(account.amount).toBe('100.00000000@DFI')
      }
    })

    it('should listAccounts with pagination.limit', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const pagination = {
        limit: 2
      }
      accounts = await client.account.listAccounts(pagination)
      expect(accounts.length).toBe(2)
    })

    it('should listAccounts with verbose false', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const accounts = await client.account.listAccounts({}, false)
      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner).toBe('string')
        expect(account.amount).toBe('100.00000000@DFI')
      }
    })

    it('should listAccounts with indexed_amounts true', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const options = {
        indexedAmounts: true
      }

      const accounts = await client.account.listAccounts({}, true, options)
      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof (account.owner as AccountOwner).asm).toBe('string')
        expect(typeof (account.owner as AccountOwner).reqSigs).toBe('number')
        expect((account.owner as AccountOwner).type).toBe('scripthash')
        expect((account.owner as AccountOwner).addresses.length).toBeGreaterThan(0)

        expect(typeof account.amount === 'object').toBe(true)
        expect((account.amount as AccountAmount)['0'].toString()).toBe('100')
      }
    })

    it('should listAccounts with isMineOnly true', async () => {
      await waitForExpect(async () => {
        const accounts = await client.account.listAccounts()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const options = {
        isMineOnly: true
      }

      const accounts = await client.account.listAccounts({}, true, options)
      for (let i = 0; i < accounts.length; i += 1) {
        const account = accounts[i]
        expect(typeof account.key).toBe('string')
        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof (account.owner as AccountOwner).asm).toBe('string')
        expect(typeof (account.owner as AccountOwner).reqSigs).toBe('number')
        expect((account.owner as AccountOwner).type).toBe('scripthash')
        expect((account.owner as AccountOwner).addresses.length).toBeGreaterThan(0)

        expect(typeof account.owner === 'object').toBe(true)
        expect(typeof (account.amount as AccountAmount)['0']).toBe('string')
      }
    })
  })

  describe.only('getAccount', () => {
    beforeAll(async () => {
      await utxosToAccount()
    })

    it.only('should getAccount', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts({}, false)
        expect(accounts.length).toBeGreaterThan(0)
      })

      const account = await client.account.getAccount(accounts[0].owner)
      console.log('account: ', account)
      // expect(account.length).toBeGreaterThan(0)
      // expect(account[0]).toBe('100.00000000@DFI')
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

      const account = await client.account.getAccount(accounts[0].owner, pagination)
      console.log('account 1: ', account)

      expect(account.length).toBeGreaterThan(0)
      expect(account[0]).toBe('100.00000000@DFI')
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
      const account = await client.account.getAccount(accounts[0].owner, pagination)
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

      const account = await client.account.getAccount(accounts[0].owner, {}, options)
      console.log('account 3: ', account)
    })
  })

  describe('getTokenBalances', () => {
    beforeAll(async () => {
      await utxosToAccount()
    })

    it('should getTokenBalances', async () => {
      let accounts: any[] = []

      await waitForExpect(async () => {
        accounts = await client.account.listAccounts()
        expect(accounts.length).toBeGreaterThan(0)
      })

      const tokenBalances = await client.account.getTokenBalances(accounts[0].owner)
      console.log('tokenBalances: ', tokenBalances)
    })
  })

  // describe('listAccountHistory', () => {
  //   beforeAll(async () => {
  //     await utxosToAccount()
  //     await utxosToAccount()
  //     await utxosToAccount()
  //   })

  //   it('should listAccountHistory', async () => {

  //   })
  // })
})
