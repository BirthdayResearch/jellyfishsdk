import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { OracleMapper } from '@src/module.model/oracle'
import { OracleHistoryMapper } from '@src/module.model/oracle.history'
import { OracleTokenCurrencyMapper } from '@src/module.model/oracle.token.currency'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, invalidateFromHeight, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { OraclePriceAggregatedMapper } from '@src/module.model/oracle.price.aggregated'
import { OracleIntervalSeconds, OraclePriceAggregatedIntervalMapper } from '@src/module.model/oracle.price.aggregated.interval'

describe('invalidate appoint/remove/update oracle', () => {
  const container = new MasterNodeRegTestContainer()
  let app: NestFastifyApplication
  let client: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should appoint and invalidate', async () => {
    const address = await container.getNewAddress()
    const oracleId = await client.oracle.appointOracle(address, [
      { token: 'TA', currency: 'USD1' },
      { token: 'TB', currency: 'USD1' }
    ], {
      weightage: 1
    })
    await container.generate(1)
    const height = await container.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    {
      const oracle = await app.get(OracleMapper).get(oracleId)
      expect(oracle).toBeDefined()
      const histories = await app.get(OracleHistoryMapper).query(oracleId, 10)
      expect(histories.length).toStrictEqual(1)

      const ta = await app.get(OracleTokenCurrencyMapper).query('TA-USD1', Number.MAX_SAFE_INTEGER)
      expect(ta.length).toStrictEqual(1)
      const tb = await app.get(OracleTokenCurrencyMapper).query('TB-USD1', Number.MAX_SAFE_INTEGER)
      expect(tb.length).toStrictEqual(1)
    }

    await invalidateFromHeight(app, container, height)
    await container.generate(2)
    await waitForIndexedHeight(app, height)

    {
      const oracle = await app.get(OracleMapper).get(oracleId)
      expect(oracle).toBeUndefined()
      const histories = await app.get(OracleHistoryMapper).query(oracleId, 10)
      expect(histories.length).toStrictEqual(0)

      const ta = await app.get(OracleTokenCurrencyMapper).query('TA-USD1', Number.MAX_SAFE_INTEGER)
      expect(ta.length).toStrictEqual(0)
      const tb = await app.get(OracleTokenCurrencyMapper).query('TB-USD1', Number.MAX_SAFE_INTEGER)
      expect(tb.length).toStrictEqual(0)
    }
  })

  it('should appoint update and invalidate with existing token currency', async () => {
    await client.oracle.appointOracle(await container.getNewAddress(), [
      { token: 'TA', currency: 'USD2' },
      { token: 'TB', currency: 'USD2' }
    ], {
      weightage: 1
    })
    await container.generate(1)
    const address = await container.getNewAddress()
    const oracleId = await client.oracle.appointOracle(address, [
      { token: 'TA', currency: 'USD2' },
      { token: 'TB', currency: 'USD2' }
    ], {
      weightage: 1
    })
    await container.generate(1)
    await client.oracle.updateOracle(oracleId, address, {
      priceFeeds: [
        { token: 'TB', currency: 'USD2' },
        { token: 'TC', currency: 'USD2' }
      ],
      weightage: 1
    })
    await container.generate(1)
    const height = await container.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    {
      const oracle = await app.get(OracleMapper).get(oracleId)
      expect(oracle).toBeDefined()
      const histories = await app.get(OracleHistoryMapper).query(oracleId, 10)
      expect(histories.length).toStrictEqual(2)

      const ta = await app.get(OracleTokenCurrencyMapper).query('TA-USD2', Number.MAX_SAFE_INTEGER)
      expect(ta.length).toStrictEqual(1)
      const tb = await app.get(OracleTokenCurrencyMapper).query('TB-USD2', Number.MAX_SAFE_INTEGER)
      expect(tb.length).toStrictEqual(2)
      const tc = await app.get(OracleTokenCurrencyMapper).query('TC-USD2', Number.MAX_SAFE_INTEGER)
      expect(tc.length).toStrictEqual(1)
    }

    await invalidateFromHeight(app, container, height)
    await container.generate(2)
    await waitForIndexedHeight(app, height)

    {
      const oracle = await app.get(OracleMapper).get(oracleId)
      expect(oracle).toBeDefined()
      const histories = await app.get(OracleHistoryMapper).query(oracleId, 10)
      expect(histories.length).toStrictEqual(1)

      const ta = await app.get(OracleTokenCurrencyMapper).query('TA-USD2', Number.MAX_SAFE_INTEGER)
      expect(ta.length).toStrictEqual(2)
      const tb = await app.get(OracleTokenCurrencyMapper).query('TB-USD2', Number.MAX_SAFE_INTEGER)
      expect(tb.length).toStrictEqual(2)
    }
  })

  it('should appoint update update and invalidate', async () => {
    const address = await container.getNewAddress()
    const oracleId = await client.oracle.appointOracle(address, [
      { token: 'TA', currency: 'USD3' },
      { token: 'TB', currency: 'USD3' }
    ], {
      weightage: 1
    })
    await container.generate(1)
    await client.oracle.updateOracle(oracleId, address, {
      priceFeeds: [
        { token: 'TB', currency: 'USD3' },
        { token: 'TC', currency: 'USD3' }
      ],
      weightage: 1
    })
    // Notice there isn't any block generate
    await client.oracle.updateOracle(oracleId, address, {
      priceFeeds: [
        { token: 'TC', currency: 'USD3' },
        { token: 'TD', currency: 'USD3' }
      ],
      weightage: 1
    })
    await container.generate(1)

    const height = await container.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    {
      const oracle = await app.get(OracleMapper).get(oracleId)
      expect(oracle).toBeDefined()
      const histories = await app.get(OracleHistoryMapper).query(oracleId, 10)
      expect(histories.length).toStrictEqual(3)

      // Uncertainty as it depends on ordering of transactions
      const ta = await app.get(OracleTokenCurrencyMapper).query('TA-USD3', Number.MAX_SAFE_INTEGER)
      const tb = await app.get(OracleTokenCurrencyMapper).query('TB-USD3', Number.MAX_SAFE_INTEGER)
      const tc = await app.get(OracleTokenCurrencyMapper).query('TC-USD3', Number.MAX_SAFE_INTEGER)
      const td = await app.get(OracleTokenCurrencyMapper).query('TD-USD3', Number.MAX_SAFE_INTEGER)
      expect(ta.length + tb.length + tc.length + td.length).toStrictEqual(2)
    }

    await invalidateFromHeight(app, container, height)
    await container.generate(2)
    await waitForIndexedHeight(app, height)

    {
      const oracle = await app.get(OracleMapper).get(oracleId)
      expect(oracle).toBeDefined()
      const histories = await app.get(OracleHistoryMapper).query(oracleId, 10)
      expect(histories.length).toStrictEqual(1) // because both transaction get rolled back

      const ta = await app.get(OracleTokenCurrencyMapper).query('TA-USD3', Number.MAX_SAFE_INTEGER)
      expect(ta.length).toStrictEqual(1)
      const tb = await app.get(OracleTokenCurrencyMapper).query('TB-USD3', Number.MAX_SAFE_INTEGER)
      expect(tb.length).toStrictEqual(1)
      const tc = await app.get(OracleTokenCurrencyMapper).query('TC-USD3', Number.MAX_SAFE_INTEGER)
      expect(tc.length).toStrictEqual(0)
      const td = await app.get(OracleTokenCurrencyMapper).query('TD-USD3', Number.MAX_SAFE_INTEGER)
      expect(td.length).toStrictEqual(0)
    }
  })

  it('should appoint remove and invalidate', async () => {
    const address = await container.getNewAddress()
    const oracleId = await client.oracle.appointOracle(address, [
      { token: 'TA', currency: 'USD4' },
      { token: 'TB', currency: 'USD4' }
    ], {
      weightage: 1
    })
    await container.generate(1)

    await client.oracle.removeOracle(oracleId)
    await container.generate(1)
    const height = await container.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    {
      const oracle = await app.get(OracleMapper).get(oracleId)
      expect(oracle).toBeUndefined()
      const histories = await app.get(OracleHistoryMapper).query(oracleId, 10)
      expect(histories.length).toStrictEqual(1)

      const ta = await app.get(OracleTokenCurrencyMapper).query('TA-USD4', Number.MAX_SAFE_INTEGER)
      expect(ta.length).toStrictEqual(0)
      const tb = await app.get(OracleTokenCurrencyMapper).query('TB-USD4', Number.MAX_SAFE_INTEGER)
      expect(tb.length).toStrictEqual(0)
    }

    await invalidateFromHeight(app, container, height)
    await container.generate(2)
    await waitForIndexedHeight(app, height)

    {
      const oracle = await app.get(OracleMapper).get(oracleId)
      expect(oracle).toBeDefined()
      const histories = await app.get(OracleHistoryMapper).query(oracleId, 10)
      expect(histories.length).toStrictEqual(1)

      const ta = await app.get(OracleTokenCurrencyMapper).query('TA-USD4', Number.MAX_SAFE_INTEGER)
      expect(ta.length).toStrictEqual(1)
      const tb = await app.get(OracleTokenCurrencyMapper).query('TB-USD4', Number.MAX_SAFE_INTEGER)
      expect(tb.length).toStrictEqual(1)
    }
  })
})

describe('invalidate set oracle data', () => {
  const container = new MasterNodeRegTestContainer()
  let app: NestFastifyApplication
  let client: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should set and invalidate', async () => {
    const address = await container.getNewAddress()
    const oracleId = await client.oracle.appointOracle(address, [
      { token: 'S1', currency: 'USD1' },
      { token: 'S2', currency: 'USD1' }
    ], {
      weightage: 1
    })
    await container.generate(1)

    await client.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [
        { tokenAmount: '1.1@S1', currency: 'USD1' },
        { tokenAmount: '1.2@S2', currency: 'USD1' }
      ]
    })
    await container.generate(1)

    const height = await container.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    {
      const s1 = await app.get(OraclePriceFeedMapper).query(`S1-USD1-${oracleId}`, Number.MAX_SAFE_INTEGER)
      expect(s1.length).toStrictEqual(1)
      const s2 = await app.get(OraclePriceFeedMapper).query(`S2-USD1-${oracleId}`, Number.MAX_SAFE_INTEGER)
      expect(s2.length).toStrictEqual(1)

      const as1 = await app.get(OraclePriceAggregatedMapper).query('S1-USD1', Number.MAX_SAFE_INTEGER)
      expect(as1.length).toStrictEqual(1)
      const as2 = await app.get(OraclePriceAggregatedMapper).query('S2-USD1', Number.MAX_SAFE_INTEGER)
      expect(as2.length).toStrictEqual(1)
    }

    await invalidateFromHeight(app, container, height)
    await container.generate(2)
    await waitForIndexedHeight(app, height)

    {
      const s1 = await app.get(OraclePriceFeedMapper).query(`S1-USD1-${oracleId}`, Number.MAX_SAFE_INTEGER)
      expect(s1.length).toStrictEqual(0)
      const s2 = await app.get(OraclePriceFeedMapper).query(`S2-USD1-${oracleId}`, Number.MAX_SAFE_INTEGER)
      expect(s2.length).toStrictEqual(0)

      const as1 = await app.get(OraclePriceAggregatedMapper).query('S1-USD1', Number.MAX_SAFE_INTEGER)
      expect(as1.length).toStrictEqual(0)
      const as2 = await app.get(OraclePriceAggregatedMapper).query('S2-USD1', Number.MAX_SAFE_INTEGER)
      expect(as2.length).toStrictEqual(0)
    }
  })

  it('should set set and invalidate', async () => {
    const address = await container.getNewAddress()
    const oracleId = await client.oracle.appointOracle(address, [
      { token: 'S1', currency: 'USD2' },
      { token: 'S2', currency: 'USD2' }
    ], {
      weightage: 1
    })
    await container.generate(1)

    await client.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [
        { tokenAmount: '1.54@S1', currency: 'USD2' },
        { tokenAmount: '5.34@S2', currency: 'USD2' }
      ]
    })
    await container.generate(1)

    await client.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
      prices: [
        { tokenAmount: '1.54@S1', currency: 'USD2' },
        { tokenAmount: '5.34@S2', currency: 'USD2' }
      ]
    })
    await container.generate(1)

    const height = await container.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    {
      const s1 = await app.get(OraclePriceFeedMapper).query(`S1-USD2-${oracleId}`, Number.MAX_SAFE_INTEGER)
      expect(s1.length).toStrictEqual(2)
      const s2 = await app.get(OraclePriceFeedMapper).query(`S2-USD2-${oracleId}`, Number.MAX_SAFE_INTEGER)
      expect(s2.length).toStrictEqual(2)

      const as1 = await app.get(OraclePriceAggregatedMapper).query('S1-USD2', Number.MAX_SAFE_INTEGER)
      expect(as1.length).toStrictEqual(2)
      const as2 = await app.get(OraclePriceAggregatedMapper).query('S2-USD2', Number.MAX_SAFE_INTEGER)
      expect(as2.length).toStrictEqual(2)
    }

    await invalidateFromHeight(app, container, height)
    await container.generate(2)
    await waitForIndexedHeight(app, height)

    {
      const s1 = await app.get(OraclePriceFeedMapper).query(`S1-USD2-${oracleId}`, Number.MAX_SAFE_INTEGER)
      expect(s1.length).toStrictEqual(1)
      const s2 = await app.get(OraclePriceFeedMapper).query(`S2-USD2-${oracleId}`, Number.MAX_SAFE_INTEGER)
      expect(s2.length).toStrictEqual(1)

      const as1 = await app.get(OraclePriceAggregatedMapper).query('S1-USD2', Number.MAX_SAFE_INTEGER)
      expect(as1.length).toStrictEqual(1)
      const as2 = await app.get(OraclePriceAggregatedMapper).query('S2-USD2', Number.MAX_SAFE_INTEGER)
      expect(as2.length).toStrictEqual(1)
    }
  })
})

describe('interval set oracle data', () => {
  const container = new MasterNodeRegTestContainer()
  let app: NestFastifyApplication
  let client: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should get interval', async () => {
    const address = await container.getNewAddress()
    const oracleId = await client.oracle.appointOracle(address, [
      {
        token: 'S1',
        currency: 'USD'
      }
    ], {
      weightage: 1
    })
    await container.generate(1)

    const oneMinute = 60
    let price = 0
    let mockTime = Math.floor(new Date().getTime() / 1000)
    for (let h = 0; h < 24; h++) { // loop for 24 hours to make a day
      for (let z = 0; z < 4; z++) { // loop for 4 x 15 mins interval to make an hour
        mockTime += (15 * oneMinute) + 1 // +1 sec to fall into the next 15 mins bucket
        await client.misc.setMockTime(mockTime)
        await container.generate(2)

        await client.oracle.setOracleData(oracleId, mockTime, {
          prices: [
            {
              tokenAmount: `${(++price).toFixed(2)}@S1`,
              currency: 'USD'
            }
          ]
        })
        await container.generate(1)
      }
    }

    const height = await container.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const noInterval = await app.get(OraclePriceAggregatedMapper).query('S1-USD', Number.MAX_SAFE_INTEGER)
    expect(noInterval.length).toStrictEqual(96)

    const interval15Mins = await app.get(OraclePriceAggregatedIntervalMapper).query(`S1-USD-${OracleIntervalSeconds.FIFTEEN_MINUTES}`, Number.MAX_SAFE_INTEGER)
    expect(interval15Mins.length).toStrictEqual(96)
    let prevMedianTime = 0
    let checkPrice = price
    interval15Mins.forEach(value => {
      expect(value.aggregated.amount).toStrictEqual(checkPrice.toFixed(8)) // check if price is descending in intervals of 1
      checkPrice--
      if (prevMedianTime !== 0) { // check if time interval is in 15 mins block
        expect(prevMedianTime - value.block.medianTime - 1).toStrictEqual(OracleIntervalSeconds.FIFTEEN_MINUTES) // account for +1 in mock time
      }
      prevMedianTime = value.block.medianTime
    })

    const interval1Hour = await app.get(OraclePriceAggregatedIntervalMapper).query(`S1-USD-${OracleIntervalSeconds.ONE_HOUR}`, Number.MAX_SAFE_INTEGER)
    expect(interval1Hour.length).toStrictEqual(24)
    prevMedianTime = 0
    interval1Hour.forEach(value => { // check if time interval is in 1-hour block
      if (prevMedianTime !== 0) {
        expect(prevMedianTime - value.block.medianTime - 4).toStrictEqual(OracleIntervalSeconds.ONE_HOUR) // account for + 1 per block in mock time
      }
      prevMedianTime = value.block.medianTime
    })
    expect(interval1Hour.map(x => x.aggregated.amount)).toStrictEqual(
      [
        '94.50000000',
        '90.50000000',
        '86.50000000',
        '82.50000000',
        '78.50000000',
        '74.50000000',
        '70.50000000',
        '66.50000000',
        '62.50000000',
        '58.50000000',
        '54.50000000',
        '50.50000000',
        '46.50000000',
        '42.50000000',
        '38.50000000',
        '34.50000000',
        '30.50000000',
        '26.50000000',
        '22.50000000',
        '18.50000000',
        '14.50000000',
        '10.50000000',
        '6.50000000',
        '2.50000000'
      ]
    )

    const interval1Day = await app.get(OraclePriceAggregatedIntervalMapper).query(`S1-USD-${OracleIntervalSeconds.ONE_DAY}`, Number.MAX_SAFE_INTEGER)
    expect(interval1Day.length).toStrictEqual(1)
    prevMedianTime = 0
    interval1Day.forEach(value => { // check if time interval is in 1-day block
      if (prevMedianTime !== 0) {
        expect(prevMedianTime - value.block.medianTime - 96).toStrictEqual(OracleIntervalSeconds.ONE_DAY) // account for + 1 per block in mock time
      }
      prevMedianTime = value.block.medianTime
    })
    expect(interval1Day.map(x => x.aggregated.amount)).toStrictEqual(
      [
        '48.50000000'
      ]
    )
  })
})
