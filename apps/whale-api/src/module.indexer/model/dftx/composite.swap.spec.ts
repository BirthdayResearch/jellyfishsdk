import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeightLatest } from '../../../e2e.module'
import { Testing } from '@defichain/jellyfish-testing'
import { PoolSwapMapper } from '../../../module.model/pool.swap'
import { DeFiDCache } from '../../../module.api/cache/defid.cache'
import { TokenInfo } from '@defichain/jellyfish-api-core/dist/category/token'

const container = new MasterNodeRegTestContainer()
let testing: Testing
let app: NestFastifyApplication

beforeEach(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()

  testing = Testing.create(container)

  const tokens = ['B', 'C', 'D']

  await testing.token.dfi({ amount: 10000 })

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await testing.token.create({ symbol: token })
    await container.generate(1)
    await testing.token.mint({ amount: 10000, symbol: token })
    await testing.poolpair.create({ tokenA: token, tokenB: 'DFI' })
    await container.generate(1)
    await testing.poolpair.add({ a: { symbol: token, amount: 100 }, b: { symbol: 'DFI', amount: 200 } })
    await testing.token.send({ address: await testing.address('my'), symbol: token, amount: 1000 })
  }

  await container.generate(1)

  app = await createTestingApp(container)
  const defiCache = app.get(DeFiDCache)

  const tokenResult = await container.call('listtokens')
  // precache
  for (const k in tokenResult) {
    await defiCache.getTokenInfo(k) as TokenInfo
  }
})

afterEach(async () => {
  await stopTestingApp(container, app)
})

describe('composite swap', () => {
  it('should index composite swap', async () => {
    await waitForIndexedHeightLatest(app, container)
    const poolSwapMapper = app.get(PoolSwapMapper)

    const result = await testing.rpc.poolpair.listPoolPairs()
    const poolPairs = Object.entries(result)
      .map(([id, poolPair]) => {
        return { ...poolPair, id }
      })
    expect(poolPairs.length).toStrictEqual(3)

    const records = await poolSwapMapper.query(poolPairs[0].id, 30)
    expect(records.length).toStrictEqual(0)

    await testing.rpc.poolpair.compositeSwap({
      from: await testing.address('my'),
      tokenFrom: 'B',
      tokenTo: 'C',
      amountFrom: 10,
      to: await testing.address('my')
    })
    await container.generate(1)

    await waitForIndexedHeightLatest(app, container)

    const recordsAfter = await poolSwapMapper.query(poolPairs[0].id, 30)
    expect(recordsAfter.length).toStrictEqual(1)
    expect(recordsAfter[0]).toStrictEqual({
      id: expect.any(String),
      txid: expect.any(String),
      txno: expect.any(Number),
      poolPairId: expect.any(String),
      sort: expect.any(String),
      fromAmount: expect.any(String),
      fromTokenId: expect.any(Number),
      block: expect.any(Object)
    })
  })
})
