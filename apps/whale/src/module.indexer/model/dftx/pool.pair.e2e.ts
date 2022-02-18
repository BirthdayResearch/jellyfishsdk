import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, invalidateFromHeight, stopTestingApp, waitForIndexedHeightLatest } from '@src/e2e.module'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens, poolSwap, sendTokensToAddress } from '@defichain/testing'
import { PoolPairTokenMapper } from '@src/module.model/pool.pair.token'
import { PoolPairHistoryMapper } from '@src/module.model/pool.pair.history'
import { PoolSwapMapper } from '@src/module.model/pool.swap'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { PoolSwapAggregatedMapper } from '@src/module.model/pool.swap.aggregated'
import { PoolSwapAggregatedInterval } from './pool.swap.aggregated'
import { Testing } from '@defichain/jellyfish-testing'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let testing: Testing

beforeEach(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(container)

  testing = Testing.create(container)
})

afterEach(async () => {
  await stopTestingApp(container, app)
})

describe('index poolpair', () => {
  it('should index poolpair', async () => {
    const tokens = ['AB', 'AC']

    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
      await mintTokens(container, token)
    }
    await createPoolPair(container, 'AB', 'DFI')
    await createPoolPair(container, 'AC', 'DFI')

    await waitForIndexedHeightLatest(app, container)

    const poolPairTokenMapper = await app.get(PoolPairTokenMapper)
    const poolPairTokenList = await poolPairTokenMapper.list(1000)
    expect(poolPairTokenList.length).toStrictEqual(2)
  })
})

describe('index poolswap', () => {
  it('should index poolswap', async () => {
    const ownerAddress = await testing.container.getNewAddress()
    const tokens = ['A', 'B']

    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
      await mintTokens(container, token)
    }
    await createPoolPair(container, 'A', 'DFI')
    await createPoolPair(container, 'B', 'DFI')

    await addPoolLiquidity(container, {
      tokenA: 'A',
      amountA: 100,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })
    await addPoolLiquidity(container, {
      tokenA: 'B',
      amountA: 50,
      tokenB: 'DFI',
      amountB: 300,
      shareAddress: await getNewAddress(container)
    })

    await sendTokensToAddress(container, ownerAddress, 500, 'A')

    await waitForIndexedHeightLatest(app, container)

    const poolPairMapper = app.get(PoolPairHistoryMapper)
    const poolSwapMapper = app.get(PoolSwapMapper)
    const result = await poolPairMapper.getLatest('3')

    expect(result).toStrictEqual({
      commission: '0.00000000',
      id: expect.stringMatching(/[0-f]{64}/),
      sort: expect.any(String),
      name: 'A-Default Defi token',
      pairSymbol: 'A-DFI',
      poolPairId: '3',
      status: true,
      tokenA: {
        id: 1,
        symbol: 'A'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: expect.any(Object)
    })

    await poolSwap(container, {
      from: ownerAddress,
      tokenFrom: 'A',
      amountFrom: 100,
      to: ownerAddress,
      tokenTo: 'DFI'
    })

    await waitForIndexedHeightLatest(app, container)

    const resultPostSwap = await poolPairMapper.getLatest('3')
    expect(resultPostSwap).toStrictEqual({
      commission: '0.00000000',
      id: expect.stringMatching(/[0-f]{64}/),
      sort: expect.any(String),
      name: 'A-Default Defi token',
      pairSymbol: 'A-DFI',
      poolPairId: '3',
      status: true,
      tokenA: {
        id: 1,
        symbol: 'A'
      },
      tokenB: {
        id: 0,
        symbol: 'DFI'
      },
      block: expect.any(Object)
    })

    const resultSwaps = await poolSwapMapper.query('3', Number.MAX_SAFE_INTEGER)
    expect(resultSwaps).toStrictEqual([{
      txid: expect.stringMatching(/[0-f]{64}/),
      fromAmount: '100.00000000',
      fromTokenId: 1,
      id: expect.any(String),
      poolPairId: '3',
      sort: expect.any(String),
      block: expect.any(Object),
      txno: expect.any(Number)
    }])

    await poolSwap(container, {
      from: ownerAddress,
      tokenFrom: 'A',
      amountFrom: 5,
      to: ownerAddress,
      tokenTo: 'DFI'
    })

    await poolSwap(container, {
      from: ownerAddress,
      tokenFrom: 'DFI',
      amountFrom: 6,
      to: ownerAddress,
      tokenTo: 'A'
    })

    await waitForIndexedHeightLatest(app, container)

    const resultSwaps2 = await poolSwapMapper.query('3', Number.MAX_SAFE_INTEGER, undefined, HexEncoder.encodeHeight(118))
    expect(resultSwaps2).toStrictEqual([
      {
        txid: expect.stringMatching(/[0-f]{64}/),
        block: expect.any(Object),
        fromAmount: '6.00000000',
        fromTokenId: 0,
        id: expect.any(String),
        poolPairId: '3',
        sort: expect.any(String),
        txno: expect.any(Number)
      },
      {
        txid: expect.stringMatching(/[0-f]{64}/),
        block: expect.any(Object),
        fromAmount: '5.00000000',
        fromTokenId: 1,
        id: expect.any(String),
        poolPairId: '3',
        sort: expect.any(String),
        txno: expect.any(Number)
      }
    ])

    const aggregatedMapper = app.get(PoolSwapAggregatedMapper)
    const aggregated = await aggregatedMapper.query(`3-${PoolSwapAggregatedInterval.ONE_HOUR}`, 1)
    expect(aggregated[0]).toStrictEqual(
      {
        aggregated: {
          amounts: {
            0: '6.00000000',
            1: '105.00000000'
          }
        },
        block: expect.any(Object),
        id: expect.any(String),
        key: '3-3600',
        bucket: expect.any(Number)
      }
    )
  })
})

describe('index composite swap', () => {
  it('should index composite swap', async () => {
    const ownerAddress = await getNewAddress(container)
    const tokens = ['A', 'B']

    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token, { collateralAddress: ownerAddress })
      await mintTokens(container, token)
    }
    await createPoolPair(container, 'A', 'DFI')
    await createPoolPair(container, 'B', 'DFI')

    await addPoolLiquidity(container, {
      tokenA: 'A',
      amountA: 100,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })
    await addPoolLiquidity(container, {
      tokenA: 'B',
      amountA: 50,
      tokenB: 'DFI',
      amountB: 300,
      shareAddress: await getNewAddress(container)
    })

    await testing.rpc.poolpair.compositeSwap({
      from: ownerAddress,
      tokenFrom: 'A',
      amountFrom: 5,
      to: ownerAddress,
      tokenTo: 'B'
    })

    await testing.generate(1)

    await testing.rpc.poolpair.compositeSwap({
      from: ownerAddress,
      tokenFrom: 'B',
      amountFrom: 6,
      to: ownerAddress,
      tokenTo: 'A'
    })

    await waitForIndexedHeightLatest(app, container)

    const poolSwapMapper = app.get(PoolSwapMapper)
    const resultSwaps = await poolSwapMapper.query('3', Number.MAX_SAFE_INTEGER)
    expect(resultSwaps).toStrictEqual([
      {
        txid: expect.stringMatching(/[0-f]{64}/),
        block: expect.any(Object),
        fromAmount: '6.00000000',
        fromTokenId: 2,
        id: expect.any(String),
        poolPairId: '3',
        sort: expect.any(String),
        txno: expect.any(Number)
      },
      {
        txid: expect.stringMatching(/[0-f]{64}/),
        block: expect.any(Object),
        fromAmount: '5.00000000',
        fromTokenId: 1,
        id: expect.any(String),
        poolPairId: '3',
        sort: expect.any(String),
        txno: expect.any(Number)
      }
    ])

    const resultSwaps2 = await poolSwapMapper.query('4', Number.MAX_SAFE_INTEGER)
    expect(resultSwaps2).toStrictEqual([
      {
        txid: expect.stringMatching(/[0-f]{64}/),
        block: expect.any(Object),
        fromAmount: '6.00000000',
        fromTokenId: 2,
        id: expect.any(String),
        poolPairId: '4',
        sort: expect.any(String),
        txno: expect.any(Number)
      },
      {
        txid: expect.stringMatching(/[0-f]{64}/),
        block: expect.any(Object),
        fromAmount: '5.00000000',
        fromTokenId: 1,
        id: expect.any(String),
        poolPairId: '4',
        sort: expect.any(String),
        txno: expect.any(Number)
      }
    ])

    const aggregatedMapper = app.get(PoolSwapAggregatedMapper)
    const aggregated = await aggregatedMapper.query(`3-${PoolSwapAggregatedInterval.ONE_HOUR}`, 1)
    expect(aggregated[0]).toStrictEqual(
      {
        aggregated: {
          amounts: {
            1: '5.00000000',
            2: '6.00000000'
          }
        },
        block: expect.any(Object),
        id: expect.any(String),
        key: '3-3600',
        bucket: expect.any(Number)
      }
    )
  })
})

describe('poolswap 30d', () => {
  it('should index volume and swaps for 30d', async () => {
    await testing.generate(1)

    const tokens = ['A']

    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token, {
        collateralAddress: await testing.address('swap')
      })
      await mintTokens(container, token)
    }
    await createPoolPair(container, 'A', 'DFI')

    await addPoolLiquidity(container, {
      tokenA: 'A',
      amountA: 100,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })

    await testing.generate(1)

    {
      const fiveMinutes = 60 * 5
      const numBlocks = 24 * 2 * 11

      // Explicitly set minutes to 0 to avoid interval
      // inconsistency based on local time
      // Note: This is not an issue on a live blockchain as
      // the block times won't change, it's only an issue
      // in the test environment when using setMockTime
      const dateNow = new Date()
      dateNow.setUTCSeconds(0)
      dateNow.setUTCMinutes(2)
      dateNow.setUTCHours(0)
      dateNow.setUTCDate(dateNow.getUTCDate() + 2)
      const timeNow = Math.floor(dateNow.getTime() / 1000)
      await testing.rpc.misc.setMockTime(timeNow)
      await testing.generate(10)

      for (let i = 0; i <= numBlocks; i++) {
        const mockTime = timeNow + i * fiveMinutes
        await testing.rpc.misc.setMockTime(mockTime)

        await testing.rpc.poolpair.poolSwap({
          from: await testing.address('swap'),
          tokenFrom: 'A',
          amountFrom: 0.1,
          to: await testing.address('swap'),
          tokenTo: 'DFI'
        })

        await testing.generate(1)
      }

      await waitForIndexedHeightLatest(app, container)
    }

    const aggregatedMapper = app.get(PoolSwapAggregatedMapper)
    const aggregated = await aggregatedMapper.query(`2-${PoolSwapAggregatedInterval.ONE_DAY}`, 2)
    expect(aggregated).toStrictEqual([
      {
        id: expect.any(String),
        key: '2-86400',
        bucket: 1645401600,
        aggregated: {
          amounts: {
            1: '23.90000000'
          }
        },
        block: expect.any(Object)
      },
      {
        id: expect.any(String),
        key: '2-86400',
        bucket: 1645315200,
        aggregated: {
          amounts: {
            1: '29.00000000'
          }
        },
        block: expect.any(Object)
      }
    ])
  })
})

describe('poolswap invalidate', () => {
  it('should index volume and swaps and invalidate', async () => {
    await testing.generate(1)

    const tokens = ['A']

    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token, {
        collateralAddress: await testing.address('swap')
      })
      await mintTokens(container, token)
    }
    await createPoolPair(container, 'A', 'DFI')

    await addPoolLiquidity(container, {
      tokenA: 'A',
      amountA: 100,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: await getNewAddress(container)
    })

    const preSwapHeight = await testing.container.getBlockCount()
    const tenMinutes = 60 * 10
    const numBlocks = 12

    const dateNow = new Date()
    dateNow.setUTCSeconds(0)
    dateNow.setUTCMinutes(2)
    dateNow.setUTCHours(0)
    dateNow.setUTCDate(dateNow.getUTCDate() + 2)
    const timeNow = Math.floor(dateNow.getTime() / 1000)
    for (let i = 0; i < numBlocks; i++) {
      const mockTime = timeNow + i * tenMinutes
      await testing.rpc.misc.setMockTime(mockTime)

      await testing.rpc.poolpair.poolSwap({
        from: await testing.address('swap'),
        tokenFrom: 'A',
        amountFrom: 0.1,
        to: await testing.address('swap'),
        tokenTo: 'DFI'
      })

      await testing.generate(1)
    }

    await waitForIndexedHeightLatest(app, container)

    const aggregatedMapper = app.get(PoolSwapAggregatedMapper)
    const poolSwapMapper = app.get(PoolSwapMapper)

    const resultSwaps = await poolSwapMapper.query('2', Number.MAX_SAFE_INTEGER)
    expect(resultSwaps.length).toStrictEqual(numBlocks)

    const aggregated = await aggregatedMapper.query(`2-${PoolSwapAggregatedInterval.ONE_HOUR}`, Number.MAX_SAFE_INTEGER)
    expect(aggregated).toStrictEqual([
      {
        id: expect.any(String),
        key: '2-3600',
        bucket: expect.any(Number),
        aggregated: {
          amounts: {
            1: '0.40000000'
          }
        },
        block: expect.any(Object)
      },
      {
        id: expect.any(String),
        key: '2-3600',
        bucket: expect.any(Number),
        aggregated: {
          amounts: {
            1: '0.60000000'
          }
        },
        block: expect.any(Object)
      },
      {
        id: expect.any(String),
        key: '2-3600',
        bucket: expect.any(Number),
        aggregated: {
          amounts: {
            1: '0.20000000'
          }
        },
        block: expect.any(Object)
      }
    ])

    {
      const height = await testing.container.getBlockCount()

      // First test only a few blocks back to ensure reverse aggregate is working
      await invalidateFromHeight(app, container, height - 3)

      const resultSwaps = await poolSwapMapper.query('2', Number.MAX_SAFE_INTEGER)
      expect(resultSwaps.length).toStrictEqual(numBlocks - 2)

      const aggregated = await aggregatedMapper.query(`2-${PoolSwapAggregatedInterval.ONE_HOUR}`, Number.MAX_SAFE_INTEGER)
      expect(aggregated).toStrictEqual([
        {
          id: expect.any(String),
          key: '2-3600',
          bucket: expect.any(Number),
          aggregated: {
            amounts: {
              1: '0.20000000'
            }
          },
          block: expect.any(Object)
        },
        {
          id: expect.any(String),
          key: '2-3600',
          bucket: expect.any(Number),
          aggregated: {
            amounts: {
              1: '0.60000000'
            }
          },
          block: expect.any(Object)
        },
        {
          id: expect.any(String),
          key: '2-3600',
          bucket: expect.any(Number),
          aggregated: {
            amounts: {
              1: '0.20000000'
            }
          },
          block: expect.any(Object)
        }
      ])
    }

    // Test again at the base height, everything should be 0'd
    await invalidateFromHeight(app, container, preSwapHeight)

    {
      const resultSwaps = await poolSwapMapper.query('2', Number.MAX_SAFE_INTEGER)
      expect(resultSwaps).toStrictEqual([])

      const aggregated = await aggregatedMapper.query(`2-${PoolSwapAggregatedInterval.ONE_HOUR}`, Number.MAX_SAFE_INTEGER)
      expect(aggregated).toStrictEqual([
        {
          id: expect.any(String),
          key: '2-3600',
          bucket: expect.any(Number),
          aggregated: {
            amounts: {}
          },
          block: expect.any(Object)
        },
        {
          id: expect.any(String),
          key: '2-3600',
          bucket: expect.any(Number),
          aggregated: {
            amounts: {}
          },
          block: expect.any(Object)
        }
      ])
    }
  })
})
