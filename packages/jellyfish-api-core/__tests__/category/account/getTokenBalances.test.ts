import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import BigNumber from 'bignumber.js'

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await createToken(await container.call('getnewaddress'), 'DBTC', 200)
    await createToken(await container.call('getnewaddress'), 'DETH', 200)
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
    await container.waitForWalletBalanceGTE(101)
    await container.call('createtoken', [metadata])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  describe('getTokenBalances', () => {
    it('should getTokenBalances', async () => {
      await waitForExpect(async () => {
        const tokenBalances = await client.account.getTokenBalances()
        expect(tokenBalances.length).toBeGreaterThan(0)
      })

      const tokenBalances = await client.account.getTokenBalances()
      for (let i = 0; i < tokenBalances.length; i += 1) {
        expect(typeof tokenBalances[i]).toStrictEqual('string') // [ '300.00000000@0', '200.00000000@1' ]
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
      expect(tokenBalances.length).toStrictEqual(1)
    })

    it('should getTokenBalances with pagination limit', async () => {
      await waitForExpect(async () => {
        const tokenBalances = await client.account.getTokenBalances()
        expect(tokenBalances.length).toStrictEqual(2)
      })
      const pagination = {
        limit: 1
      }
      const tokenBalances = await client.account.getTokenBalances(pagination)
      expect(tokenBalances.length).toStrictEqual(1)
    })

    it('should getTokenBalances with indexedAmounts true', async () => {
      await waitForExpect(async () => {
        const tokenBalances = await client.account.getTokenBalances({}, true, { symbolLookup: false })
        expect(typeof tokenBalances === 'object').toStrictEqual(true)
        for (const k in tokenBalances) {
          expect(tokenBalances[k] instanceof BigNumber).toStrictEqual(true)
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
        expect(typeof tokenBalances[i]).toStrictEqual('string') // [ '300.00000000@DFI', '200.00000000@DBTC' ]
      }
    })
  })
})
