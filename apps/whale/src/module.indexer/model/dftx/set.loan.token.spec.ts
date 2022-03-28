import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { Testing } from '@defichain/jellyfish-testing'
import { PoolPairHistoryMapper } from '@src/module.model/pool.pair.history'
import { PoolPairTokenMapper } from '@src/module.model/pool.pair.token'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let testing: Testing

beforeEach(async () => {
  await container.start()
  app = await createTestingApp(container)
  testing = Testing.create(container)
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(101) // token creation fee

  const oracle = await testing.rpc.oracle.appointOracle(await testing.address('address'), [
    { token: 'S1', currency: 'USD' }
  ], { weightage: 1 })
  await container.generate(1)
  await testing.rpc.oracle.setOracleData(oracle, Math.floor(Date.now() / 1000), {
    prices: [
      { tokenAmount: '10.0@S1', currency: 'USD' }
    ]
  })
  await testing.generate(1)
  await testing.rpc.loan.setLoanToken({
    symbol: 'S1',
    fixedIntervalPriceId: 'S1/USD'
  })

  await testing.generate(1)
  const tokens = ['USDT', 'B', 'C', 'D', 'E', 'F']

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await testing.token.create({ symbol: token })
    await container.generate(1)
  }

  for (const token of tokens) {
    await testing.poolpair.create({ tokenA: token, tokenB: 'DFI' })
    await container.generate(1)
  }

  await container.generate(1)
})

afterEach(async () => {
  await stopTestingApp(container, app)
})

describe('set loan token', () => {
  it('should not break token id mapping', async () => {
    await container.generate(1)
    const height = await container.call('getblockcount')
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const poolPairTokenMapper = app.get(PoolPairTokenMapper)
    const poolPairHistoryMapper = app.get(PoolPairHistoryMapper)
    const result = await poolPairTokenMapper.list(30)
    expect(result.length).toStrictEqual(6)

    const poolPairs = await Promise.all(result.map(async x => {
      return await poolPairHistoryMapper.getLatest(`${x.poolPairId}`)
    }))

    expect(poolPairs[0]).toStrictEqual({
      id: expect.stringMatching(/[0-f]{64}/),
      sort: expect.stringMatching(/[0-f]{16}/),
      commission: '0.00000000',
      status: true,
      name: 'USDT-Default Defi token',
      pairSymbol: 'USDT-DFI',
      poolPairId: '8',
      tokenA: {
        id: 2,
        symbol: 'USDT'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: expect.any(Object)
    })
  })
})
