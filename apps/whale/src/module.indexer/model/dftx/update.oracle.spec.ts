import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '../../../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { OracleMapper } from '../../../module.model/oracle'
import { OracleHistoryMapper } from '../../../module.model/oracle.history'
import { OracleTokenCurrencyMapper } from '../../../module.model/oracle.token.currency'
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

it('should update weightage and pricefeeds', async () => {
  const oracleId = await client.oracle.appointOracle(await container.getNewAddress(), [{
    token: 'AAPL',
    currency: 'EUR'
  }], { weightage: 1 })
  await container.generate(1)

  const height1 = await client.blockchain.getBlockCount()
  const hash1 = await client.blockchain.getBlockHash(height1)
  const block1 = await client.blockchain.getBlock(hash1, 1)
  const medianTime1 = block1.mediantime
  const time1 = block1.time

  const txId = await client.oracle.updateOracle(oracleId, await container.getNewAddress(), {
    priceFeeds: [{
      token: 'TSLA',
      currency: 'USD'
    }],
    weightage: 2
  })
  await container.generate(1)

  const height2 = await client.blockchain.getBlockCount()
  const hash2 = await container.call('getblockhash', [height2])
  const stats2 = await container.call('getblock', [hash2, 1])
  const medianTime2 = stats2.mediantime
  const time2 = stats2.time
  await container.generate(1)
  await waitForIndexedHeight(app, height2)

  const oracleMapper = app.get(OracleMapper)
  const oracle = await oracleMapper.get(oracleId)
  expect(oracle).toStrictEqual(
    {
      id: oracleId,
      weightage: 2,
      priceFeeds: [{ token: 'TSLA', currency: 'USD' }],
      ownerAddress: expect.any(String),
      block: {
        hash: hash2,
        height: height2,
        medianTime: medianTime2,
        time: time2
      }
    }
  )

  const oracleHistoryMapper = app.get(OracleHistoryMapper)
  const histories = await oracleHistoryMapper.query(oracleId, 10)
  expect(histories.length).toStrictEqual(2)
  expect(histories).toStrictEqual(
    [
      {
        id: `${oracleId}-${height2}-${txId}`,
        sort: `${HexEncoder.encodeHeight(height2)}${txId}`,
        oracleId,
        ownerAddress: expect.any(String),
        weightage: 2,
        priceFeeds: [{ token: 'TSLA', currency: 'USD' }],
        block: {
          hash: hash2,
          height: height2,
          medianTime: medianTime2,
          time: time2
        }
      },
      {
        id: `${oracleId}-${height1}-${oracleId}`,
        sort: `${HexEncoder.encodeHeight(height1)}${oracleId}`,
        oracleId,
        ownerAddress: expect.any(String),
        weightage: 1,
        priceFeeds: [{ token: 'AAPL', currency: 'EUR' }],
        block: {
          hash: hash1,
          height: height1,
          medianTime: medianTime1,
          time: time1
        }
      }
    ]
  )

  const tokenCurrencyMapper = app.get(OracleTokenCurrencyMapper)
  const tokenCurrencies1 = await tokenCurrencyMapper.query('AAPL-EUR', Number.MAX_SAFE_INTEGER)
  expect(tokenCurrencies1.length).toStrictEqual(0)

  const tokenCurrencies2 = await tokenCurrencyMapper.query('TSLA-USD', Number.MAX_SAFE_INTEGER)
  expect(tokenCurrencies2.length).toStrictEqual(1)
  expect(tokenCurrencies2).toStrictEqual(
    [
      {
        id: `TSLA-USD-${oracleId}`,
        key: 'TSLA-USD',
        oracleId,
        token: 'TSLA',
        currency: 'USD',
        weightage: 2,
        block: {
          hash: hash2,
          height: height2,
          medianTime: medianTime2,
          time: time2
        }
      }
    ]
  )

  const data = await container.call('getoracledata', [oracleId])
  expect(data).toStrictEqual(
    {
      weightage: 2,
      oracleid: oracleId,
      address: expect.any(String),
      priceFeeds: [{ token: 'TSLA', currency: 'USD' }],
      tokenPrices: []
    }
  )
})
