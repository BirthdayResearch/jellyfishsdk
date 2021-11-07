import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { FixedIntervalPricePagination } from '../../../src/category/oracle'

describe('Oracle', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)
  let oracleId: string
  let timestamp: number

  async function setup (): Promise<void> {
  // token setup
    const aliceColAddr = await testing.generateAddress()
    await testing.token.dfi({ address: aliceColAddr, amount: 100000 })
    await testing.generate(1)

    // oracle setup
    const addr = await testing.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
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
          { tokenAmount: '2@TSLA', currency: 'USD' },
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

      // const prices = await testing.container.call('listfixedintervalprices')
      // console.log('prices: ', prices)
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
