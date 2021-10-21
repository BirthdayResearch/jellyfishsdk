import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { FixedIntervalPricePagination } from 'packages/jellyfish-api-core/src/category/oracle'

describe('Oracle', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)
  let oracleId: string
  let timestamp: number

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    const aliceColAddr = await testing.container.getNewAddress()
    await testing.token.dfi({ address: aliceColAddr, amount: 100000 })
    await testing.generate(1)
    await testing.token.create({ symbol: 'BTC', collateralAddress: aliceColAddr })
    await testing.generate(1)
    await testing.token.mint({ symbol: 'BTC', amount: 30000 })
    await testing.generate(1)

    // oracle setup
    const addr = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'UBER', currency: 'USD' }
    ]
    oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await testing.generate(1)

    timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '1@DFI', currency: 'USD' },
          { tokenAmount: '60000@BTC', currency: 'USD' },
          { tokenAmount: '8@UBER', currency: 'USD' }
        ]
      }
    )
    await testing.generate(1)

    // setCollateralToken DFI
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await testing.generate(1)

    // setCollateralToken BTC
    await testing.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await testing.generate(1)

    // setLoanToken UBER
    await testing.rpc.loan.setLoanToken({
      symbol: 'UBER',
      fixedIntervalPriceId: 'UBER/USD'
    })
    await testing.generate(1)
  }

  it('should listFixedIntervalPrices', async () => {
    {
      const prices = await testing.rpc.oracle.listFixedIntervalPrices()
      expect(prices).toStrictEqual([
        { activePriceBlock: expect.any(Number), nextPriceBlock: expect.any(Number) },
        {
          priceFeedId: 'BTC/USD',
          activePrice: new BigNumber('60000'),
          nextPrice: new BigNumber('60000'),
          timestamp: expect.any(Number),
          isValid: true
        },
        {
          priceFeedId: 'DFI/USD',
          activePrice: new BigNumber('1'),
          nextPrice: new BigNumber('1'),
          timestamp: expect.any(Number),
          isValid: true
        },
        {
          priceFeedId: 'UBER/USD',
          activePrice: new BigNumber('0'),
          nextPrice: new BigNumber('8'),
          timestamp: expect.any(Number),
          isValid: false
        }
      ])
    }

    {
      await testing.generate(6)
      const prices = await testing.rpc.oracle.listFixedIntervalPrices()
      expect(prices[3]).toStrictEqual({
        priceFeedId: 'UBER/USD',
        activePrice: new BigNumber('8'),
        nextPrice: new BigNumber('8'),
        timestamp: expect.any(Number),
        isValid: true
      })
    }

    {
      await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '32@UBER', currency: 'USD' }] })
      const prices = await testing.rpc.oracle.listFixedIntervalPrices()
      expect(prices[3]).toStrictEqual({
        priceFeedId: 'UBER/USD',
        activePrice: new BigNumber('8'),
        nextPrice: new BigNumber('8'),
        timestamp: expect.any(Number),
        isValid: true
      })
    }

    {
      await testing.generate(6)
      const prices = await testing.rpc.oracle.listFixedIntervalPrices()
      expect(prices[3]).toStrictEqual({
        priceFeedId: 'UBER/USD',
        activePrice: new BigNumber('8'),
        nextPrice: new BigNumber('32'),
        timestamp: expect.any(Number),
        isValid: false
      })
    }

    {
      await testing.generate(6)
      const prices = await testing.rpc.oracle.listFixedIntervalPrices()
      expect(prices[3]).toStrictEqual({
        priceFeedId: 'UBER/USD',
        activePrice: new BigNumber('32'),
        nextPrice: new BigNumber('32'),
        timestamp: expect.any(Number),
        isValid: true
      })
    }
  })

  it('should listFixedIntervalPrices with limit', async () => {
    const prices = await testing.rpc.oracle.listFixedIntervalPrices({ limit: 1 })
    expect(prices.length).toStrictEqual(1)
  })

  it('should listFixedIntervalPrices with pagination start and including_start', async () => {
    {
      const pagination: FixedIntervalPricePagination = {
        start: 'DFI/USD'
      }

      const prices = await testing.rpc.oracle.listFixedIntervalPrices(pagination)
      expect(prices[1].priceFeedId).toStrictEqual('DFI/USD')
    }

    {
      const pagination: FixedIntervalPricePagination = {
        start: 'UBER/USD'
      }

      const prices = await testing.rpc.oracle.listFixedIntervalPrices(pagination)
      expect(prices[1].priceFeedId).toStrictEqual('UBER/USD')
    }
  })
})
