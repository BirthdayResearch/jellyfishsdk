import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, invalidateFromHeight, stopTestingApp, waitForIndexedHeight, waitForIndexedHeightLatest } from '@src/e2e.module'
import { Testing } from '@defichain/jellyfish-testing'
import { PoolPairHistoryMapper } from '@src/module.model/pool.pair.history'
import { PoolPairTokenMapper } from '@src/module.model/pool.pair.token'

const container = new MasterNodeRegTestContainer()
let testing: Testing
let app: NestFastifyApplication

beforeEach(async () => {
  await container.start()
  app = await createTestingApp(container)
  testing = Testing.create(container)
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(101) // token creation fee

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
})

afterEach(async () => {
  await stopTestingApp(container, app)
})

describe('composite swap', () => {
  it('should index composite swap', async () => {
    await waitForIndexedHeightLatest(app, container)

    const poolPairTokenMapper = app.get(PoolPairTokenMapper)
    const poolPairMapper = app.get(PoolPairHistoryMapper)
    const result = await poolPairTokenMapper.list(30)
    expect(result.length).toStrictEqual(3)

    const poolPairs = await Promise.all(result.map(async x => {
      return await poolPairMapper.getLatest(`${x.poolPairId}`)
    }))

    expect(poolPairs[0]).toStrictEqual({
      id: expect.stringMatching(/[0-f]{64}/),
      sort: expect.any(String),
      pairSymbol: 'B-DFI',
      name: 'B-Default Defi token',
      poolPairId: '2',
      tokenA: {
        id: 1,
        symbol: 'B'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: {
        hash: expect.any(String),
        height: 103,
        medianTime: expect.any(Number),
        time: expect.any(Number)
      },
      status: true,
      commission: '0.00000000'
    })

    await testing.rpc.poolpair.compositeSwap({
      from: await testing.address('my'),
      tokenFrom: 'B',
      tokenTo: 'C',
      amountFrom: 10,
      to: await testing.address('my')
    })

    await waitForIndexedHeightLatest(app, container)

    const poolPairsAfterSwap = await Promise.all(result.map(async x => {
      return await poolPairMapper.getLatest(`${x.poolPairId}`)
    }))

    expect(poolPairsAfterSwap[0]).toStrictEqual({
      id: expect.stringMatching(/[0-f]{64}/),
      sort: expect.any(String),
      pairSymbol: 'B-DFI',
      name: 'B-Default Defi token',
      poolPairId: '2',
      tokenA: {
        id: 1,
        symbol: 'B'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: {
        hash: expect.any(String),
        height: 103,
        medianTime: expect.any(Number),
        time: expect.any(Number)
      },
      status: true,
      commission: '0.00000000'
    })

    expect(poolPairsAfterSwap[1]).toStrictEqual({
      id: expect.stringMatching(/[0-f]{64}/),
      sort: expect.any(String),
      pairSymbol: 'C-DFI',
      name: 'C-Default Defi token',
      poolPairId: '4',
      tokenA: {
        id: 3,
        symbol: 'C'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: {
        hash: expect.any(String),
        height: 105,
        medianTime: expect.any(Number),
        time: expect.any(Number)
      },
      status: true,
      commission: '0.00000000'
    })
  })
})

describe('invalidate', () => {
  it('should composite swap and invalidate', async () => {
    await waitForIndexedHeightLatest(app, container)

    const poolPairTokenMapper = app.get(PoolPairTokenMapper)
    const poolPairMapper = app.get(PoolPairHistoryMapper)
    const result = await poolPairTokenMapper.list(30)
    expect(result.length).toStrictEqual(3)

    const poolPairs = await Promise.all(result.map(async x => {
      return await poolPairMapper.getLatest(`${x.poolPairId}`)
    }))

    const preSwapPool = {
      id: expect.stringMatching(/[0-f]{64}/),
      sort: expect.any(String),
      pairSymbol: 'B-DFI',
      name: 'B-Default Defi token',
      poolPairId: '2',
      tokenA: {
        id: 1,
        symbol: 'B'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: {
        hash: expect.any(String),
        height: 103,
        medianTime: expect.any(Number),
        time: expect.any(Number)
      },
      status: true,
      commission: '0.00000000'
    }

    expect(poolPairs[0]).toStrictEqual(preSwapPool)

    const height = await container.call('getblockcount')
    await testing.rpc.poolpair.compositeSwap({
      from: await testing.address('my'),
      tokenFrom: 'B',
      tokenTo: 'C',
      amountFrom: 10,
      to: await testing.address('my')
    })

    await waitForIndexedHeightLatest(app, container)

    const poolPairsAfterSwap = await Promise.all(result.map(async x => {
      return await poolPairMapper.getLatest(`${x.poolPairId}`)
    }))

    expect(poolPairsAfterSwap[0]).toStrictEqual({
      id: expect.stringMatching(/[0-f]{64}/),
      sort: expect.any(String),
      pairSymbol: 'B-DFI',
      name: 'B-Default Defi token',
      poolPairId: '2',
      tokenA: {
        id: 1,
        symbol: 'B'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: {
        hash: expect.any(String),
        height: 103,
        medianTime: expect.any(Number),
        time: expect.any(Number)
      },
      status: true,
      commission: '0.00000000'
    })

    await invalidateFromHeight(app, container, height - 1)
    await container.generate(2)
    await waitForIndexedHeight(app, height)

    const poolPairsAfterInvalidate = await Promise.all(result.map(async x => {
      return await poolPairMapper.getLatest(`${x.poolPairId}`)
    }))

    expect(poolPairsAfterInvalidate[0]).toStrictEqual(preSwapPool)
  })
})
