import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight, invalidateFromHeight } from '@src/e2e.module'
import { createPoolPair, createToken, mintTokens } from '@defichain/testing'
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
    await mintTokens(container, token)
  }

  for (const token of tokens) {
    await createPoolPair(container, token, 'DFI')
  }

  await container.generate(1)

  await container.call('updatepoolpair', [{ pool: 11, status: false, commission: 0.5 }])
  await container.generate(1)
})

afterEach(async () => {
  await stopTestingApp(container, app)
})

describe('update poolpair', () => {
  it('should index poolpairs', async () => {
    await container.generate(1)
    const height = await container.call('getblockcount')
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const poolPairTokenMapper = app.get(PoolPairTokenMapper)
    const poolPairMapper = app.get(PoolPairMapper)
    const result = await poolPairTokenMapper.list(30)
    const poolPairs = await Promise.all(result.map(async x => {
      return await poolPairMapper.getLatest(`${x.poolpairId}`)
    }))

    expect(poolPairs[1]).toStrictEqual({
      commission: '0.50000000',
      id: '11-127',
      pairSymbol: 'E-DFI',
      poolPairId: '11',
      status: false,
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
  })
})

describe('invalidate', () => {
  it('should create, update poolpair and invalidate', async () => {
    await container.generate(1)
    const height = await container.call('getblockcount')
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    await container.call('updatepoolpair', [{ pool: 11, status: true, commission: 0.75 }])
    await container.generate(1)
    const heightUpdated = await container.call('getblockcount')

    await container.generate(1)
    await waitForIndexedHeight(app, heightUpdated)

    const poolPairMapper = app.get(PoolPairMapper)
    const poolPair = await poolPairMapper.getLatest('11')
    expect(poolPair).toStrictEqual({
      commission: '0.75000000',
      id: '11-130',
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

    await invalidateFromHeight(app, container, heightUpdated - 1)
    await container.generate(2)
    await waitForIndexedHeight(app, heightUpdated)

    const poolPairInvalidated = await poolPairMapper.getLatest('11')
    expect(poolPairInvalidated).toStrictEqual({
      commission: '0.50000000',
      id: '11-127',
      pairSymbol: 'E-DFI',
      poolPairId: '11',
      status: false,
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
  })
})
