import waitForExpect from 'wait-for-expect'
import { AccountHistoryCountOptions, TxType } from '../../../src/category/account'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('accountHistoryCount', () => {
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
        token: 'DFI'
      }
      const countWithDBTC = await client.account.historyCount('mine', options1)
      const countWithDFI = await client.account.historyCount('mine', options2)

      expect(typeof countWithDBTC).toBe('number')
      expect(typeof countWithDFI).toBe('number')
      expect(countWithDBTC).toStrictEqual(1)
      expect(countWithDFI).toStrictEqual(111)
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
