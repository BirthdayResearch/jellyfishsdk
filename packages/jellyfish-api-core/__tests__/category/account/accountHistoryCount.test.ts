import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { AccountHistoryCountOptions, TxType } from '../../../src/category/account'

describe('Account with DBTC and DETH', () => {
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

  it('should get accountHistoryCount', async () => {
    await waitForExpect(async () => {
      const count = await client.account.historyCount()

      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  it('should get accountHistoryCount with owner as all', async () => {
    await waitForExpect(async () => {
      const count = await client.account.historyCount('all')

      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  it('should get accountHistoryCount with no_rewards option', async () => {
    await waitForExpect(async () => {
      const options: AccountHistoryCountOptions = {
        no_rewards: true
      }
      const count = await client.account.historyCount('mine', options)

      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  it('should get accountHistoryCount with token option', async () => {
    await waitForExpect(async () => {
      const options1: AccountHistoryCountOptions = {
        token: 'DBTC'
      }
      const options2: AccountHistoryCountOptions = {
        token: 'DETH'
      }
      const countWithDBTC = await client.account.historyCount('mine', options1)
      const countWithDETH = await client.account.historyCount('mine', options2)

      expect(typeof countWithDBTC).toBe('number')
      expect(typeof countWithDETH).toBe('number')
      expect(countWithDBTC).toStrictEqual(5)
      expect(countWithDETH).toStrictEqual(3)
    })
  })

  it('should get accountHistory with txtype option', async () => {
    await waitForExpect(async () => {
      const options: AccountHistoryCountOptions = {
        txtype: TxType.MINT_TOKEN
      }
      const count = await client.account.historyCount('mine', options)

      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  it('should get different count for different txtypes', async () => {
    await waitForExpect(async () => {
      const options1: AccountHistoryCountOptions = {
        txtype: TxType.MINT_TOKEN
      }
      const options2: AccountHistoryCountOptions = {
        txtype: TxType.POOL_SWAP

      }
      const count1 = await client.account.historyCount('mine', options1)
      const count2 = await client.account.historyCount('mine', options2)

      expect(count1 === count2).toStrictEqual(false)
    })
  })
})
