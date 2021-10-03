import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight, invalidateFromHeight } from '@src/e2e.module'
import { createPoolPair, createToken } from '@defichain/testing'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'

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
    const poolPairMapper = app.get(PoolPairMapper)
    const result = await poolPairTokenMapper.list(30)
    expect(result.length).toStrictEqual(6)

    const poolPairs = await Promise.all(result.map(async x => {
      return await poolPairMapper.getLatest(`${x.poolpairId}`)
    }))

    expect(poolPairs[1]).toStrictEqual({
      commission: '0.00000000',
      id: '11-112',
      pairSymbol: 'E-DFI',
      poolPairId: '11',
      status: true,
      tokenA: {
        id: 5,
        symbol: 'E'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: expect.any(Object)
    })

    expect(poolPairs[0]).toStrictEqual({
      commission: '0.00000000',
      id: '12-113',
      pairSymbol: 'F-DFI',
      poolPairId: '12',
      status: true,
      tokenA: {
        id: 6,
        symbol: 'F'
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

    const poolPairMapper = app.get(PoolPairMapper)
    const poolPair = await poolPairMapper.getLatest('14')
    expect(poolPair).toStrictEqual({
      commission: '0.00000000',
      id: '14-116',
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

    const poolPairInvalidated = await poolPairMapper.getLatest('14')
    expect(poolPairInvalidated).toStrictEqual(undefined)
  })
})
