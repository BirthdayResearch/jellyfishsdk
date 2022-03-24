import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '../../../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { OraclePriceFeedMapper } from '../../../module.model/oracle.price.feed'
import { OraclePriceAggregatedMapper } from '../../../module.model/oracle.price.aggregated'
import { PriceTickerMapper } from '../../../module.model/price.ticker'
import { HexEncoder } from '../../../module.model/_hex.encoder'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

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

it('should set oracle data', async () => {
  const oracleId1 = await client.oracle.appointOracle(await container.getNewAddress(), [
    { token: 'AAPL', currency: 'EUR' },
    { token: 'TSLA', currency: 'USD' }
  ], { weightage: 1 })
  await container.generate(1)

  const oracleId2 = await client.oracle.appointOracle(await container.getNewAddress(), [
    { token: 'AAPL', currency: 'EUR' },
    { token: 'TSLA', currency: 'USD' }
  ], { weightage: 2 })
  await container.generate(1)

  const timestamp = Math.floor(new Date().getTime() / 1000)

  const prices1 = [
    { tokenAmount: '0.5@AAPL', currency: 'EUR' },
    { tokenAmount: '1.0@TSLA', currency: 'USD' }
  ]

  const txId = await client.oracle.setOracleData(oracleId1, timestamp, { prices: prices1 })
  await container.generate(1)

  const height1 = await client.blockchain.getBlockCount()
  const hash1 = await client.blockchain.getBlockHash(height1)
  const block1 = await client.blockchain.getBlock(hash1, 1)
  const medianTime1 = block1.mediantime
  const time1 = block1.time
  await container.generate(1)

  const prices2 = [
    { tokenAmount: '1.5@AAPL', currency: 'EUR' },
    { tokenAmount: '2.0@TSLA', currency: 'USD' }
  ]

  await client.oracle.setOracleData(oracleId2, timestamp, { prices: prices2 })
  await container.generate(1)

  const height2 = await client.blockchain.getBlockCount()
  const hash2 = await client.blockchain.getBlockHash(height2)
  const block2 = await client.blockchain.getBlock(hash2, 1)
  const medianTime2 = block2.mediantime
  const time2 = block2.time
  await container.generate(1)
  await waitForIndexedHeight(app, height2)

  const feedMapper = app.get(OraclePriceFeedMapper)

  const feed1 = await app.get(OraclePriceFeedMapper).query(`AAPL-EUR-${oracleId1}`, 1)
  expect(feed1.length).toStrictEqual(1)
  expect(feed1).toStrictEqual([{
    id: `AAPL-EUR-${oracleId1}-${txId}`,
    key: `AAPL-EUR-${oracleId1}`,
    sort: `${HexEncoder.encodeHeight(height1)}${txId}`,
    amount: '0.5',
    currency: 'EUR',
    block: {
      hash: hash1,
      height: height1,
      medianTime: medianTime1,
      time: time1
    },
    oracleId: oracleId1,
    time: timestamp,
    token: 'AAPL',
    txid: txId
  }])

  const feed2 = await feedMapper.query(`TSLA-USD-${oracleId1}`, 10)
  expect(feed2.length).toStrictEqual(1)

  const feed3 = await feedMapper.query(`AAPL-EUR-${oracleId2}`, 10)
  expect(feed3.length).toStrictEqual(1)

  const feed4 = await feedMapper.query(`TSLA-USD-${oracleId2}`, 10)
  expect(feed4.length).toStrictEqual(1)

  const priceAggregratedMapper = app.get(OraclePriceAggregatedMapper)

  const priceAggregrated1 = await priceAggregratedMapper.query('AAPL-EUR', Number.MAX_SAFE_INTEGER)
  expect(priceAggregrated1).toStrictEqual(
    [
      {
        block: {
          hash: hash2,
          height: height2,
          medianTime: medianTime2,
          time: time2
        },
        aggregated: {
          amount: '1.16666667', // NOTE(jingyi2811): (0.5 + (1.5 * 2)) / 3
          weightage: 3,
          oracles: {
            active: 2,
            total: 2
          }
        },
        currency: 'EUR',
        token: 'AAPL',
        id: `AAPL-EUR-${height2}`,
        key: 'AAPL-EUR',
        sort: `${HexEncoder.encodeHeight(medianTime2)}${HexEncoder.encodeHeight(height2)}`
      },
      {
        block: {
          hash: hash1,
          height: height1,
          medianTime: medianTime1,
          time: time1
        },
        aggregated: {
          amount: '0.50000000',
          weightage: 1,
          oracles: {
            active: 1,
            total: 2
          }
        },
        currency: 'EUR',
        token: 'AAPL',
        id: `AAPL-EUR-${height1}`,
        key: 'AAPL-EUR',
        sort: `${HexEncoder.encodeHeight(medianTime1)}${HexEncoder.encodeHeight(height1)}`
      }
    ]
  )

  const priceAggregrated2 = await priceAggregratedMapper.query('TSLA-USD', Number.MAX_SAFE_INTEGER)
  expect(priceAggregrated2.length).toStrictEqual(2)

  const priceTickerMapper = app.get(PriceTickerMapper)
  const result = await priceTickerMapper.query(10)
  expect(result).toStrictEqual(
    [
      {
        id: 'TSLA-USD',
        sort: `${HexEncoder.encodeHeight(2)}${HexEncoder.encodeHeight(height2)}TSLA-USD`,
        price: {
          block: {
            hash: hash2,
            height: height2,
            medianTime: medianTime2,
            time: time2
          },
          aggregated: {
            amount: '1.66666667', // NOTE(jingyi2811): (1 + (2 * 2)) / 3
            weightage: 3,
            oracles: {
              active: 2,
              total: 2
            }
          },
          currency: 'USD',
          token: 'TSLA',
          id: `TSLA-USD-${height2}`,
          key: 'TSLA-USD',
          sort: `${HexEncoder.encodeHeight(medianTime2)}${HexEncoder.encodeHeight(height2)}`
        }
      },
      {
        id: 'AAPL-EUR',
        sort: `${HexEncoder.encodeHeight(2)}${HexEncoder.encodeHeight(height2)}AAPL-EUR`,
        price: {
          block: {
            hash: hash2,
            height: height2,
            medianTime: medianTime2,
            time: time2
          },
          aggregated: {
            amount: '1.16666667', // NOTE(jingyi2811): (0.5 + (1.5 * 2)) / 3
            weightage: 3,
            oracles: {
              active: 2,
              total: 2
            }
          },
          currency: 'EUR',
          token: 'AAPL',
          id: `AAPL-EUR-${height2}`,
          key: 'AAPL-EUR',
          sort: `${HexEncoder.encodeHeight(medianTime2)}${HexEncoder.encodeHeight(height2)}`
        }
      }
    ]
  )

  const data = await container.call('listprices', [])
  expect(data).toStrictEqual(
    [
      { token: 'AAPL', currency: 'EUR', price: 1.16666666, ok: true },
      { token: 'TSLA', currency: 'USD', price: 1.66666666, ok: true }
    ]
  )
})
