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

it('should get weightage and pricefeeds', async () => {
  const oracleId = await client.oracle.appointOracle(await container.getNewAddress(), [{
    token: 'AAPL',
    currency: 'EUR'
  }], { weightage: 1 })
  await container.generate(1)

  const height = await client.blockchain.getBlockCount()
  const hash = await client.blockchain.getBlockHash(height)
  const block = await client.blockchain.getBlock(hash, 1)
  const medianTime = block.mediantime
  const time = block.time
  await container.generate(1)
  await waitForIndexedHeight(app, height)

  const oracleMapper = app.get(OracleMapper)
  const oracle = await oracleMapper.get(oracleId)
  expect(oracle).toStrictEqual(
    {
      id: oracleId,
      weightage: 1,
      ownerAddress: expect.any(String),
      priceFeeds: [{ token: 'AAPL', currency: 'EUR' }],
      block: {
        hash,
        height,
        medianTime,
        time
      }
    }
  )

  const oracleHistoryMapper = app.get(OracleHistoryMapper)
  const histories = await oracleHistoryMapper.query(oracleId, 10)
  expect(histories.length).toStrictEqual(1)
  expect(histories).toStrictEqual(
    [
      {
        id: `${oracleId}-${height}-${oracleId}`,
        sort: `${HexEncoder.encodeHeight(height)}${oracleId}`,
        oracleId,
        ownerAddress: expect.any(String),
        weightage: 1,
        priceFeeds: [{ token: 'AAPL', currency: 'EUR' }],
        block: {
          hash,
          height,
          medianTime,
          time
        }
      }
    ]
  )

  const tokenCurrencyMapper = app.get(OracleTokenCurrencyMapper)
  const tokenCurrencies = await tokenCurrencyMapper.query('AAPL-EUR', Number.MAX_SAFE_INTEGER)
  expect(tokenCurrencies.length).toStrictEqual(1)
  expect(tokenCurrencies).toStrictEqual(
    [
      {
        id: `AAPL-EUR-${oracleId}`,
        key: 'AAPL-EUR',
        oracleId,
        token: 'AAPL',
        currency: 'EUR',
        weightage: 1,
        block: {
          hash,
          height,
          medianTime,
          time
        }
      }
    ]
  )

  const data = await container.call('getoracledata', [oracleId])
  expect(data).toStrictEqual(
    {
      weightage: 1,
      oracleid: oracleId,
      address: expect.any(String),
      priceFeeds: [{ token: 'AAPL', currency: 'EUR' }],
      tokenPrices: []
    }
  )
})
