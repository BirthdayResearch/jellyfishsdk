import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { AccountHistoryCountOptions, DfTxType } from '../../../src/category/account'

describe('Account', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  let from: string, to: string

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
    from = await container.call('getnewaddress')
    await createToken(from, 'DBTC', 200)

    to = await accountToAccount('DBTC', 5, from)
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

    return to
  }

  it('should get accountHistoryCount', async () => {
    await waitForExpect(async () => {
      const count = await client.account.historyCount()

      expect(typeof count).toStrictEqual('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  it('should get accountHistoryCount with owner as all', async () => {
    await waitForExpect(async () => {
      const count = await client.account.historyCount('all')

      expect(typeof count).toStrictEqual('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  it('should get accountHistoryCount with no_rewards option', async () => {
    await waitForExpect(async () => {
      const options: AccountHistoryCountOptions = {
        no_rewards: true
      }
      const count = await client.account.historyCount('mine', options)

      expect(typeof count).toStrictEqual('number')
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

      expect(typeof countWithDBTC).toStrictEqual('number')
      expect(typeof countWithDETH).toStrictEqual('number')
      expect(countWithDBTC).toBeGreaterThanOrEqual(1)
      expect(countWithDETH).toBeGreaterThanOrEqual(1)
    })
  })

  it('should get accountHistoryCount with txtype option', async () => {
    await waitForExpect(async () => {
      const options: AccountHistoryCountOptions = {
        txtype: DfTxType.MINT_TOKEN
      }
      const count = await client.account.historyCount('mine', options)

      expect(typeof count).toStrictEqual('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  it('should get different count for different txtypes', async () => {
    await waitForExpect(async () => {
      const options1: AccountHistoryCountOptions = {
        txtype: DfTxType.MINT_TOKEN
      }
      const options2: AccountHistoryCountOptions = {
        txtype: DfTxType.POOL_SWAP
      }
      const count1 = await client.account.historyCount('mine', options1)
      const count2 = await client.account.historyCount('mine', options2)

      expect(count1 === count2).toStrictEqual(false)
    })
  })

  it('should get accountHistoryCount for multiple txtypes at once', async () => {
    const mintCount = await client.account.historyCount('mine', { txtype: DfTxType.MINT_TOKEN })
    const poolSwapCount = await client.account.historyCount('mine', { txtype: DfTxType.POOL_SWAP })

    await waitForExpect(async () => {
      const combinedCount = await client.account.historyCount('mine', { txtypes: [DfTxType.MINT_TOKEN, DfTxType.POOL_SWAP] })
      expect(combinedCount).toStrictEqual(mintCount + poolSwapCount)
    })
  })

  it('should get accountHistoryCount for multiple addresses at once', async () => {
    const fromCount = await client.account.historyCount(from)
    const toCount = await client.account.historyCount(to)

    await waitForExpect(async () => {
      const combinedCount = await client.account.historyCount([from, to])
      expect(combinedCount).toStrictEqual(fromCount + toCount)
    })
  })
})
