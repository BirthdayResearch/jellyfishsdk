import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, invalidateFromHeight, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { createPoolPair, createToken } from '@defichain/testing'
import { PoolPairHistoryMapper } from '@src/module.model/pool.pair.history'
import { PoolPairTokenMapper } from '@src/module.model/pool.pair.token'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeEach(async () => {
  await container.start()
  app = await createTestingApp(container)
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(101) // token creation fee

  const tokens = ['USDT', 'B', 'C', 'D', 'E', 'F']

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
  }

  for (const token of tokens) {
    await createPoolPair(container, token, 'DFI')
  }

  await container.generate(1)
})

afterEach(async () => {
  await stopTestingApp(container, app)
})

describe('create poolpair', () => {
  it('should index poolpairs', async () => {
    await container.generate(1)
    const height = await container.call('getblockcount')
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const poolPairTokenMapper = app.get(PoolPairTokenMapper)
    const poolPairMapper = app.get(PoolPairHistoryMapper)
    const result = await poolPairTokenMapper.list(30)
    expect(result.length).toStrictEqual(6)

    const poolPairs = await Promise.all(result.map(async x => {
      return await poolPairMapper.getLatest(`${x.poolPairId}`)
    }))

    expect(poolPairs[0]).toStrictEqual({
      id: expect.stringMatching(/[0-f]{64}/),
      sort: expect.stringMatching(/[0-f]{16}/),
      commission: '0.00000000',
      name: 'USDT-Default Defi token',
      pairSymbol: 'USDT-DFI',
      poolPairId: '7',
      status: true,
      tokenA: {
        id: 1,
        symbol: 'USDT'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: expect.any(Object)
    })

    expect(poolPairs[1]).toStrictEqual({
      id: expect.stringMatching(/[0-f]{64}/),
      sort: expect.stringMatching(/[0-f]{16}/),
      commission: '0.00000000',
      name: 'B-Default Defi token',
      pairSymbol: 'B-DFI',
      poolPairId: '8',
      status: true,
      tokenA: {
        id: 2,
        symbol: 'B'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: expect.any(Object)
    })
  })
})

describe('invalidate', () => {
  it('should create poolpair and invalidate', async () => {
    const token = 'G'
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
    await createPoolPair(container, token, 'DFI')
    await container.generate(1)
    const height = await container.call('getblockcount')

    await container.generate(1)
    await waitForIndexedHeight(app, height)
    await container.generate(2)

    const poolPairHistoryMapper = app.get(PoolPairHistoryMapper)
    const poolPair = await poolPairHistoryMapper.getLatest('14')
    expect(poolPair).toStrictEqual({
      id: expect.stringMatching(/[0-f]{64}/),
      sort: expect.stringMatching(/[0-f]{16}/),
      commission: '0.00000000',
      name: 'G-Default Defi token',
      pairSymbol: 'G-DFI',
      poolPairId: '14',
      status: true,
      tokenA: {
        id: 13,
        symbol: 'G'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: expect.any(Object)
    })

    await invalidateFromHeight(app, container, height - 1)
    await container.generate(2)
    await waitForIndexedHeight(app, height)

    const poolPairInvalidated = await poolPairHistoryMapper.getLatest('14')
    expect(poolPairInvalidated).toStrictEqual(undefined)
  })
})
