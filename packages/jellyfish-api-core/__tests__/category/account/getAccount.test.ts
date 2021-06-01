import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('Account', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(100)
    await createToken(await container.getNewAddress(), 'DBTC', 200)
  })

  afterAll(async () => {
    await container.stop()
  })

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
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  it('should getAccount', async () => {
    const accounts = await client.account.listAccounts()

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

    const account = await client.account.getAccount(accounts[0].owner.addresses[0], pagination)
    expect(account.length).toStrictEqual(1)

    for (let i = 0; i < account.length; i += 1) {
      expect(typeof account[i]).toStrictEqual('string')
    }
  })

  it('should getAccount with pagination.limit', async () => {
    const accounts = await client.account.listAccounts()

    const pagination = {
      limit: 1
    }
    const account = await client.account.getAccount(accounts[0].owner.addresses[0], pagination)
    expect(account.length).toStrictEqual(1)
  })

  it('should getAccount with indexedAmount true', async () => {
    const accounts = await client.account.listAccounts()

    const account = await client.account.getAccount(accounts[0].owner.addresses[0], {}, { indexedAmounts: true })
    expect(typeof account).toStrictEqual('object')
    for (const k in account) {
      expect(typeof account[k]).toStrictEqual('number')
    }
  })
})
