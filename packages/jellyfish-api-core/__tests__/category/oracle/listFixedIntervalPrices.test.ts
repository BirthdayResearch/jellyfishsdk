import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { FixedIntervalPricePagination } from '../../../src/category/oracle'

describe('Oracle', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)
  let oracleId: string
  let timestamp: number
  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'UBER', currency: 'USD' },
    { token: 'GOOGL', currency: 'USD' },
    { token: 'AMZN', currency: 'USD' }
  ]

  async function setup (): Promise<void> {
  // token setup
    const aliceColAddr = await testing.generateAddress()
    await testing.token.dfi({ address: aliceColAddr, amount: 100000 })
    await testing.generate(1)

    // oracle setup
    const addr = await testing.generateAddress()
    oracleId = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await testing.generate(1)

    timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '1@DFI', currency: 'USD' },
          { tokenAmount: '2@TSLA', currency: 'USD' },
          { tokenAmount: '8@UBER', currency: 'USD' },
          { tokenAmount: '2@GOOGL', currency: 'USD' },
          { tokenAmount: '8@AMZN', currency: 'USD' }
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

    // setLoanToken TSLA
    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.generate(1)

    // setLoanToken UBER
    await testing.rpc.loan.setLoanToken({
      symbol: 'UBER',
      fixedIntervalPriceId: 'UBER/USD'
    })
    await testing.generate(1)

    // setLoanToken GOOGL
    await testing.rpc.loan.setLoanToken({
      symbol: 'GOOGL',
      fixedIntervalPriceId: 'GOOGL/USD'
    })
    await testing.generate(1)

    // setLoanToken AMZN
    await testing.rpc.loan.setLoanToken({
      symbol: 'AMZN',
      fixedIntervalPriceId: 'AMZN/USD'
    })
    await testing.generate(1)
  }

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should listFixedIntervalPrices', async () => {
    {
      const prices = await testing.rpc.oracle.listFixedIntervalPrices()
      expect(prices).toStrictEqual([
        {
          priceFeedId: 'DFI/USD',
          activePrice: new BigNumber('0'),
          nextPrice: new BigNumber('1'),
          timestamp: expect.any(Number),
          isLive: false
        },
        {
          priceFeedId: 'TSLA/USD',
          activePrice: new BigNumber('0'),
          nextPrice: new BigNumber('2'),
          timestamp: expect.any(Number),
          isLive: false
        },
        {
          priceFeedId: 'UBER/USD',
          activePrice: new BigNumber('0'),
          nextPrice: new BigNumber('8'),
          timestamp: expect.any(Number),
          isLive: false
        },
        {
          priceFeedId: 'GOOGL/USD',
          activePrice: new BigNumber('0'),
          nextPrice: new BigNumber('2'),
          timestamp: expect.any(Number),
          isLive: false
        },
        {
          priceFeedId: 'AMZN/USD',
          activePrice: new BigNumber('0'),
          nextPrice: new BigNumber('8'),
          timestamp: expect.any(Number),
          isLive: false
        }
      ])
    }

    {
      await testing.container.waitForPriceValid('UBER/USD')
      const prices = await testing.rpc.oracle.listFixedIntervalPrices()
      expect(prices[2]).toStrictEqual({
        priceFeedId: 'UBER/USD',
        activePrice: new BigNumber('8'),
        nextPrice: new BigNumber('8'),
        timestamp: expect.any(Number),
        isLive: true
      })
    }

    {
      await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '32@UBER', currency: 'USD' }] })
      await testing.container.waitForPriceInvalid('UBER/USD')
      const pricesBefore = await testing.rpc.oracle.listFixedIntervalPrices()
      expect(pricesBefore[2]).toStrictEqual({
        priceFeedId: 'UBER/USD',
        activePrice: new BigNumber('8'),
        nextPrice: new BigNumber('32'),
        timestamp: expect.any(Number),
        isLive: false
      })

      await testing.container.waitForPriceValid('UBER/USD')
      const pricesAfter = await testing.rpc.oracle.listFixedIntervalPrices()
      expect(pricesAfter[2]).toStrictEqual({
        priceFeedId: 'UBER/USD',
        activePrice: new BigNumber('32'),
        nextPrice: new BigNumber('32'),
        timestamp: expect.any(Number),
        isLive: true
      })
    }

    // should listFixedIntervalPrices with latest price
    {
      await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '10@TSLA', currency: 'USD' }] })
      await testing.generate(1)
      await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '12@TSLA', currency: 'USD' }] })
      await testing.generate(1)
      await testing.container.waitForPriceInvalid('TSLA/USD')

      const prices = await testing.rpc.oracle.listFixedIntervalPrices()
      expect(prices[1]).toStrictEqual({
        priceFeedId: 'TSLA/USD',
        activePrice: new BigNumber('2'),
        nextPrice: new BigNumber('12'), // ensure its the latest set price
        timestamp: expect.any(Number),
        isLive: false
      })
    }
  })

  it('should listFixedIntervalPrices with several oracles', async () => {
    // another oracle setup
    {
      const addr = await testing.generateAddress()
      const oracleId1 = await testing.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
      await testing.generate(1)

      await testing.rpc.oracle.setOracleData(
        oracleId1,
        timestamp,
        {
          prices: [
            { tokenAmount: '1@DFI', currency: 'USD' },
            { tokenAmount: '2@TSLA', currency: 'USD' },
            { tokenAmount: '8@UBER', currency: 'USD' },
            { tokenAmount: '5@GOOGL', currency: 'USD' },
            { tokenAmount: '9@AMZN', currency: 'USD' }
          ]
        }
      )
      await testing.generate(1)

      const oracle = await testing.rpc.oracle.getOracleData(oracleId)
      expect(oracle.tokenPrices[2]).toStrictEqual({
        token: 'GOOGL',
        currency: 'USD',
        amount: 2,
        timestamp: expect.any(Number)
      })
      expect(oracle.tokenPrices[0]).toStrictEqual({
        token: 'AMZN',
        currency: 'USD',
        amount: 8,
        timestamp: expect.any(Number)
      })

      const oracle1 = await testing.rpc.oracle.getOracleData(oracleId1)
      expect(oracle1.tokenPrices[2]).toStrictEqual({
        token: 'GOOGL',
        currency: 'USD',
        amount: 5,
        timestamp: expect.any(Number)
      })
      expect(oracle1.tokenPrices[0]).toStrictEqual({
        token: 'AMZN',
        currency: 'USD',
        amount: 9,
        timestamp: expect.any(Number)
      })
    }

    {
      const prices = await testing.rpc.oracle.listPrices()
      expect(prices[2]).toStrictEqual({
        token: 'GOOGL',
        currency: 'USD',
        price: new BigNumber('3.5'),
        ok: true
      })
      expect(prices[0]).toStrictEqual({
        token: 'AMZN',
        currency: 'USD',
        price: new BigNumber('8.5'),
        ok: true
      })
    }

    {
      await testing.generate(2)
      const prices = await testing.container.call('listfixedintervalprices')
      expect(prices).toStrictEqual([
        {
          priceFeedId: 'DFI/USD',
          activePrice: 1,
          nextPrice: 1,
          timestamp: expect.any(Number),
          isLive: true
        },
        {
          priceFeedId: 'AMZN/USD',
          activePrice: 0, // weird
          nextPrice: 8,
          timestamp: expect.any(Number),
          isLive: false
        },
        {
          priceFeedId: 'TSLA/USD',
          activePrice: 2,
          nextPrice: 2,
          timestamp: expect.any(Number),
          isLive: true
        },
        {
          priceFeedId: 'UBER/USD',
          activePrice: 8,
          nextPrice: 8,
          timestamp: expect.any(Number),
          isLive: true
        },
        {
          priceFeedId: 'GOOGL/USD',
          activePrice: 2,
          nextPrice: 2,
          timestamp: expect.any(Number),
          isLive: true
        }
      ])
    }
    {
      await testing.generate(1)
      const prices = await testing.container.call('listfixedintervalprices')
      expect(prices).toStrictEqual([
        {
          priceFeedId: 'DFI/USD',
          activePrice: 1,
          nextPrice: 1,
          timestamp: expect.any(Number),
          isLive: true
        },
        {
          priceFeedId: 'AMZN/USD',
          activePrice: 8,
          nextPrice: 8.5,
          timestamp: expect.any(Number),
          isLive: true // weird
        },
        {
          priceFeedId: 'TSLA/USD',
          activePrice: 2,
          nextPrice: 2,
          timestamp: expect.any(Number),
          isLive: true
        },
        {
          priceFeedId: 'UBER/USD',
          activePrice: 8,
          nextPrice: 8,
          timestamp: expect.any(Number),
          isLive: true
        },
        {
          priceFeedId: 'GOOGL/USD',
          activePrice: 2,
          nextPrice: 3.5,
          timestamp: expect.any(Number),
          isLive: false
        }
      ])
    }

    {
      await testing.rpc.oracle.setOracleData(
        oracleId,
        timestamp,
        {
          prices: [
            { tokenAmount: '1@DFI', currency: 'USD' },
            { tokenAmount: '2@TSLA', currency: 'USD' },
            { tokenAmount: '8@UBER', currency: 'USD' },
            { tokenAmount: '10@GOOGL', currency: 'USD' },
            { tokenAmount: '15@AMZN', currency: 'USD' }
          ]
        }
      )

      await testing.container.waitForPriceInvalid('GOOGL/USD')
      await testing.container.waitForPriceInvalid('AMZN/USD')
      const prices = await testing.rpc.oracle.listFixedIntervalPrices()
      expect(prices).toStrictEqual([
        {
          priceFeedId: 'DFI/USD',
          activePrice: new BigNumber('1'),
          nextPrice: new BigNumber('1'),
          timestamp: expect.any(Number),
          isLive: true
        },
        {
          priceFeedId: 'AMZN/USD',
          activePrice: new BigNumber('8.5'),
          nextPrice: new BigNumber('12'),
          timestamp: expect.any(Number),
          isLive: false
        },
        {
          priceFeedId: 'TSLA/USD',
          activePrice: new BigNumber('2'),
          nextPrice: new BigNumber('2'),
          timestamp: expect.any(Number),
          isLive: true
        },
        {
          priceFeedId: 'UBER/USD',
          activePrice: new BigNumber('8'),
          nextPrice: new BigNumber('8'),
          timestamp: expect.any(Number),
          isLive: true
        },
        {
          priceFeedId: 'GOOGL/USD',
          activePrice: new BigNumber('3.5'),
          nextPrice: new BigNumber('7.5'),
          timestamp: expect.any(Number),
          isLive: false
        }
      ])
    }
  })

  it('should listFixedIntervalPrices with limit', async () => {
    const prices = await testing.rpc.oracle.listFixedIntervalPrices({ limit: 1 })
    expect(prices.length).toStrictEqual(1)
  })

  it('should listFixedIntervalPrices with pagination start', async () => {
    {
      const pagination: FixedIntervalPricePagination = {
        start: 'DFI/USD'
      }

      const prices = await testing.rpc.oracle.listFixedIntervalPrices(pagination)
      expect(prices[0].priceFeedId).toStrictEqual('DFI/USD')
    }

    {
      const pagination: FixedIntervalPricePagination = {
        start: 'UBER/USD'
      }

      const prices = await testing.rpc.oracle.listFixedIntervalPrices(pagination)
      expect(prices[0].priceFeedId).toStrictEqual('UBER/USD')
    }
  })
})
