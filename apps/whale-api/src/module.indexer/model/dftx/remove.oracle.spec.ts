import { DeFiDRpcError, MasterNodeRegTestContainer } from '@defichain/testcontainers'
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

it('should remove weightage and pricefeeds', async () => {
  const oracleId = await client.oracle.appointOracle(await container.getNewAddress(), [{
    token: 'AAPL',
    currency: 'EUR'
  }], { weightage: 1 })
  await container.generate(1)

  const height1 = await client.blockchain.getBlockCount()
  const hash = await client.blockchain.getBlockHash(height1)
  const block = await client.blockchain.getBlock(hash, 1)
  const medianTime = block.mediantime
  const time = block.time

  await client.oracle.removeOracle(oracleId)
  await container.generate(1)

  const height2 = await container.call('getblockcount')
  await container.generate(1)
  await waitForIndexedHeight(app, height2)

  const oracleMapper = app.get(OracleMapper)
  const oracle = await oracleMapper.get(oracleId)
  expect(oracle).toBeUndefined()

  const oracleHistoryMapper = app.get(OracleHistoryMapper)
  const histories = await oracleHistoryMapper.query(oracleId, 10)
  expect(histories.length).toStrictEqual(1)
  expect(histories).toStrictEqual(
    [
      {
        id: `${oracleId}-${height1}-${oracleId}`,
        sort: `${HexEncoder.encodeHeight(height1)}${oracleId}`,
        oracleId,
        ownerAddress: expect.any(String),
        weightage: 1,
        priceFeeds: [{ token: 'AAPL', currency: 'EUR' }],
        block: {
          hash,
          height: height1,
          medianTime,
          time
        }
      }
    ]
  )

  const tokenCurrencyMapper = app.get(OracleTokenCurrencyMapper)
  const tokenCurrencies = await tokenCurrencyMapper.query('AAPL-EUR', Number.MAX_SAFE_INTEGER)
  expect(tokenCurrencies.length).toStrictEqual(0)

  const promise = container.call('getoracledata', [oracleId])
  await expect(promise).rejects.toThrow(DeFiDRpcError)
  await expect(promise).rejects.toThrow(`DeFiDRpcError: 'oracle <${oracleId}> not found', code: -20`)
})
