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
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    // app = await createMockIndexerTestingApp(container)
    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should get interval', async () => {
    const address = await container.getNewAddress()
    const oracleId = await client.oracle.appointOracle(address, [
      { token: 'S1', currency: 'USD' }
    ], {
      weightage: 1
    })
    await container.generate(1)

    const oneMinute = 60
    const timeNow = Math.floor(new Date().getTime() / 1000)
    for (let i = 0; i < 60; i++) {
      const mockTime = timeNow + i * oneMinute
      const price = (i + 1).toFixed(2)
      await client.oracle.setOracleData(oracleId, timeNow + 5 * 60 - 1, {
        prices: [
          { tokenAmount: `${price}@S1`, currency: 'USD' }
        ]
      })
      await client.call('setmocktime', [mockTime], 'number')
      await container.generate(1)
    }

    const height = await container.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const noInterval = await app.get(OraclePriceAggregatedMapper).query('S1-USD', Number.MAX_SAFE_INTEGER)
    expect(noInterval.length).toStrictEqual(60)

    const interval5Minutes = await app.get(OraclePriceAggregatedIntervalMapper).query(`S1-USD-${OracleIntervalSeconds.FIVE_MINUTES}`, Number.MAX_SAFE_INTEGER)
    expect(interval5Minutes.length).toStrictEqual(10)
    expect(interval5Minutes.map(x => x.aggregated.amount)).toStrictEqual(
      [
        '60.00000000',
        '56.50000000',
        '50.50000000',
        '44.50000000',
        '38.50000000',
        '32.50000000',
        '26.50000000',
        '20.50000000',
        '14.50000000',
        '6.00000000'
      ]
    )

    const interval10Minutes = await app.get(OraclePriceAggregatedIntervalMapper).query(`S1-USD-${OracleIntervalSeconds.TEN_MINUTES}`, Number.MAX_SAFE_INTEGER)
    expect(interval10Minutes.length).toStrictEqual(5)
    expect(interval10Minutes.map(x => x.aggregated.amount)).toStrictEqual(
      [
        '55.00000000',
        '44.00000000',
        '33.00000000',
        '22.00000000',
        '8.50000000'
      ]
    )
  })
})
