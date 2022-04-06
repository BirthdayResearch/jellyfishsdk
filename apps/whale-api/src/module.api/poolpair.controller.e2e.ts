import { PoolPairController } from '@src/module.api/poolpair.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import { NotFoundException } from '@nestjs/common'
import { BigNumber } from 'bignumber.js'
import { SemaphoreCache } from '@src/module.api/cache/semaphore.cache'
import { CacheOption } from '@src/module.api/cache/global.cache'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: PoolPairController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  controller = app.get(PoolPairController)

  // Disable cache during tests
  const cache = app.get(SemaphoreCache)
  jest.spyOn(cache, 'get').mockImplementation(
    async (key: string, fetch: () => Promise<any>, options: CacheOption = {}): Promise<any> => {
      return await fetch()
    }
  )

  await waitForIndexedHeight(app, 100)

  await setup()
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

async function setup (): Promise<void> {
  const tokens = [
    'A', 'B', 'C', 'D', 'E', 'F',

    // For testing swap paths
    'G', // bridged via A to the rest
    'H', // isolated - no associated poolpair
    'I', 'J', 'K', 'L' // isolated from the rest - only swappable with one another
  ]

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
    await mintTokens(container, token)
  }

  // Create non-DAT token - direct RPC call required as createToken() will
  // rpc call 'gettoken' with symbol, but will fail for non-DAT tokens
  await container.waitForWalletBalanceGTE(110)
  await container.call('createtoken', [{
    symbol: 'M',
    name: 'M',
    isDAT: false,
    mintable: true,
    tradeable: true,
    collateralAddress: await getNewAddress(container)
  }])
  await container.generate(1)

  await createPoolPair(container, 'A', 'DFI')
  await createPoolPair(container, 'B', 'DFI')
  await createPoolPair(container, 'C', 'DFI')
  await createPoolPair(container, 'D', 'DFI')
  await createPoolPair(container, 'E', 'DFI')
  await createPoolPair(container, 'F', 'DFI')

  await createPoolPair(container, 'G', 'A')
  await createPoolPair(container, 'I', 'J')
  await createPoolPair(container, 'J', 'K')
  await createPoolPair(container, 'J', 'L')
  await createPoolPair(container, 'L', 'K')

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
  await addPoolLiquidity(container, {
    tokenA: 'C',
    amountA: 90,
    tokenB: 'DFI',
    amountB: 360,
    shareAddress: await getNewAddress(container)
  })

  // 1 G = 5 A = 10 DFI
  await addPoolLiquidity(container, {
    tokenA: 'G',
    amountA: 10,
    tokenB: 'A',
    amountB: 50,
    shareAddress: await getNewAddress(container)
  })

  // 1 J = 7 K
  await addPoolLiquidity(container, {
    tokenA: 'J',
    amountA: 10,
    tokenB: 'K',
    amountB: 70,
    shareAddress: await getNewAddress(container)
  })

  // 1 J = 2 L = 8 K
  await addPoolLiquidity(container, {
    tokenA: 'J',
    amountA: 4,
    tokenB: 'L',
    amountB: 8,
    shareAddress: await getNewAddress(container)
  })
  await addPoolLiquidity(container, {
    tokenA: 'L',
    amountA: 5,
    tokenB: 'K',
    amountB: 20,
    shareAddress: await getNewAddress(container)
  })

  // BURN should not be listed as swappable
  await createToken(container, 'BURN')
  await createPoolPair(container, 'BURN', 'DFI', { status: false })
  await mintTokens(container, 'BURN', { mintAmount: 1 })
  await addPoolLiquidity(container, {
    tokenA: 'BURN',
    amountA: 1,
    tokenB: 'DFI',
    amountB: 1,
    shareAddress: await getNewAddress(container)
  })

  // dexUsdtDfi setup
  await createToken(container, 'USDT')
  await createPoolPair(container, 'USDT', 'DFI')
  await mintTokens(container, 'USDT')
  await addPoolLiquidity(container, {
    tokenA: 'USDT',
    amountA: 1000,
    tokenB: 'DFI',
    amountB: 431.51288,
    shareAddress: await getNewAddress(container)
  })

  await container.call('setgov', [{ LP_SPLITS: { 14: 1.0 } }])
  await container.generate(1)
}

describe('list', () => {
  it('should list', async () => {
    const response = await controller.list({
      size: 30
    })

    expect(response.data.length).toStrictEqual(12)
    expect(response.page).toBeUndefined()

    expect(response.data[1]).toStrictEqual({
      id: '14',
      symbol: 'B-DFI',
      displaySymbol: 'dB-DFI',
      name: 'B-Default Defi token',
      status: true,
      tokenA: {
        id: '2',
        symbol: 'B',
        reserve: '50',
        blockCommission: '0',
        displaySymbol: 'dB'
      },
      tokenB: {
        id: '0',
        symbol: 'DFI',
        reserve: '300',
        blockCommission: '0',
        displaySymbol: 'DFI'
      },
      apr: {
        reward: 2229.42,
        total: 2229.42,
        commission: 0
      },
      commission: '0',
      totalLiquidity: {
        token: '122.47448713',
        usd: '1390.4567576291117892'
      },
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      priceRatio: {
        ab: '0.16666666',
        ba: '6'
      },
      rewardPct: '1',
      customRewards: undefined,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      volume: {
        d30: 0,
        h24: 0
      }
    })
  })

  it('should list with pagination', async () => {
    const first = await controller.list({
      size: 2
    })
    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('14')
    expect(first.data[0].symbol).toStrictEqual('A-DFI')
    expect(first.data[1].symbol).toStrictEqual('B-DFI')

    const next = await controller.list({
      size: 12,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(10)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].symbol).toStrictEqual('C-DFI')
    expect(next.data[1].symbol).toStrictEqual('D-DFI')
    expect(next.data[2].symbol).toStrictEqual('E-DFI')
    expect(next.data[3].symbol).toStrictEqual('F-DFI')
  })

  it('should list with undefined next pagination', async () => {
    const first = await controller.list({
      size: 2,
      next: undefined
    })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('14')
  })
})

describe('get', () => {
  it('should get', async () => {
    const response = await controller.get('13')

    expect(response).toStrictEqual({
      id: '13',
      symbol: 'A-DFI',
      displaySymbol: 'dA-DFI',
      name: 'A-Default Defi token',
      status: true,
      tokenA: {
        id: expect.any(String),
        symbol: 'A',
        reserve: '100',
        blockCommission: '0',
        displaySymbol: 'dA'
      },
      tokenB: {
        id: '0',
        symbol: 'DFI',
        reserve: '200',
        blockCommission: '0',
        displaySymbol: 'DFI'
      },
      apr: {
        reward: 0,
        total: 0,
        commission: 0
      },
      commission: '0',
      totalLiquidity: {
        token: '141.42135623',
        usd: '926.9711717527411928'
      },
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      priceRatio: {
        ab: '0.5',
        ba: '2'
      },
      rewardPct: '0',
      customRewards: undefined,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      volume: {
        d30: 0,
        h24: 0
      }
    })
  })

  it('should throw error while getting non-existent poolpair', async () => {
    expect.assertions(2)
    try {
      await controller.get('999')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find poolpair',
        error: 'Not Found'
      })
    }
  })
})

describe('get best path', () => {
  it('should be bidirectional swap path - listPaths(a, b) === listPaths(b, a)', async () => {
    const paths1 = await controller.getBestPath('1', '0') // A to DFI
    const paths2 = await controller.getBestPath('0', '1') // DFI to A
    expect(paths1).toStrictEqual({
      fromToken: {
        id: '1',
        symbol: 'A',
        displaySymbol: 'dA'
      },
      toToken: {
        id: '0',
        symbol: 'DFI',
        displaySymbol: 'DFI'
      },
      bestPath: [
        {
          symbol: 'A-DFI',
          poolPairId: '13',
          priceRatio: { ab: '0.50000000', ba: '2.00000000' },
          tokenA: { id: '1', symbol: 'A', displaySymbol: 'dA' },
          tokenB: { id: '0', symbol: 'DFI', displaySymbol: 'DFI' }
        }
      ],
      estimatedReturn: '2.00000000'
    })
    expect(paths1.bestPath).toStrictEqual(paths2.bestPath)
  })

  it('should get best swap path - 2 legs', async () => {
    const response = await controller.getBestPath('1', '3') // A to C
    expect(response).toStrictEqual({
      fromToken: {
        id: '1',
        symbol: 'A',
        displaySymbol: 'dA'
      },
      toToken: {
        id: '3',
        symbol: 'C',
        displaySymbol: 'dC'
      },
      bestPath: [
        {
          symbol: 'A-DFI',
          poolPairId: '13',
          priceRatio: { ab: '0.50000000', ba: '2.00000000' },
          tokenA: { id: '1', symbol: 'A', displaySymbol: 'dA' },
          tokenB: { id: '0', symbol: 'DFI', displaySymbol: 'DFI' }
        },
        {
          symbol: 'C-DFI',
          poolPairId: '15',
          priceRatio: { ab: '0.25000000', ba: '4.00000000' },
          tokenA: { id: '3', symbol: 'C', displaySymbol: 'dC' },
          tokenB: { id: '0', symbol: 'DFI', displaySymbol: 'DFI' }
        }
      ],
      estimatedReturn: '0.50000000'
    })
  })

  it('should get correct swap path - 3 legs', async () => {
    const response = await controller.getBestPath('7', '3') // G to C
    expect(response).toStrictEqual({
      fromToken: {
        id: '7',
        symbol: 'G',
        displaySymbol: 'dG'
      },
      toToken: {
        id: '3',
        symbol: 'C',
        displaySymbol: 'dC'
      },
      bestPath: [
        {
          symbol: 'G-A',
          poolPairId: '19',
          priceRatio: { ab: '0.20000000', ba: '5.00000000' },
          tokenA: { id: '7', symbol: 'G', displaySymbol: 'dG' },
          tokenB: { id: '1', symbol: 'A', displaySymbol: 'dA' }
        },
        {
          symbol: 'A-DFI',
          poolPairId: '13',
          priceRatio: { ab: '0.50000000', ba: '2.00000000' },
          tokenA: { id: '1', symbol: 'A', displaySymbol: 'dA' },
          tokenB: { id: '0', symbol: 'DFI', displaySymbol: 'DFI' }
        },
        {
          symbol: 'C-DFI',
          poolPairId: '15',
          priceRatio: { ab: '0.25000000', ba: '4.00000000' },
          tokenA: { id: '3', symbol: 'C', displaySymbol: 'dC' },
          tokenB: { id: '0', symbol: 'DFI', displaySymbol: 'DFI' }
        }
      ],
      estimatedReturn: '2.50000000'
    })
  })

  it('should get best of two possible swap paths', async () => {
    // 1 J = 7 K
    // 1 J = 2 L = 8 K
    const response = await controller.getBestPath('10', '11')
    expect(response).toStrictEqual({
      fromToken: {
        id: '10',
        symbol: 'J',
        displaySymbol: 'dJ'
      },
      toToken: {
        id: '11',
        symbol: 'K',
        displaySymbol: 'dK'
      },
      bestPath: [
        {
          symbol: 'J-L',
          poolPairId: '22',
          priceRatio: { ab: '0.50000000', ba: '2.00000000' },
          tokenA: { id: '10', symbol: 'J', displaySymbol: 'dJ' },
          tokenB: { id: '12', symbol: 'L', displaySymbol: 'dL' }
        },
        {
          symbol: 'L-K',
          poolPairId: '23',
          priceRatio: { ab: '0.25000000', ba: '4.00000000' },
          tokenA: { id: '12', symbol: 'L', displaySymbol: 'dL' },
          tokenB: { id: '11', symbol: 'K', displaySymbol: 'dK' }
        }
      ],
      estimatedReturn: '8.00000000'
    })
  })

  it('should have no swap path - isolated token H', async () => {
    const response = await controller.getBestPath('8', '1') // H to A impossible
    expect(response).toStrictEqual({
      fromToken: {
        id: '8',
        symbol: 'H',
        displaySymbol: 'dH'
      },
      toToken: {
        id: '1',
        symbol: 'A',
        displaySymbol: 'dA'
      },
      bestPath: [],
      estimatedReturn: '0'
    })
  })

  it('should throw error for invalid tokenId', async () => {
    await expect(controller.getBestPath('-1', '1')).rejects.toThrowError('Unable to find token -1')
    await expect(controller.getBestPath('1', '-1')).rejects.toThrowError('Unable to find token -1')
    await expect(controller.getBestPath('100', '1')).rejects.toThrowError('Unable to find token 100')
    await expect(controller.getBestPath('1', '100')).rejects.toThrowError('Unable to find token 100')
    await expect(controller.getBestPath('-1', '100')).rejects.toThrowError('Unable to find token -1')
  })
})

describe('get all paths', () => {
  it('should be bidirectional swap path - listPaths(a, b) === listPaths(b, a)', async () => {
    const paths1 = await controller.listPaths('1', '0') // A to DFI
    const paths2 = await controller.listPaths('0', '1') // DFI to A
    expect(paths1).toStrictEqual({
      fromToken: {
        id: '1',
        symbol: 'A',
        displaySymbol: 'dA'
      },
      toToken: {
        id: '0',
        symbol: 'DFI',
        displaySymbol: 'DFI'
      },
      paths: [
        [
          {
            symbol: 'A-DFI',
            poolPairId: '13',
            tokenA: { id: '1', symbol: 'A', displaySymbol: 'dA' },
            tokenB: { id: '0', symbol: 'DFI', displaySymbol: 'DFI' },
            priceRatio: { ab: '0.50000000', ba: '2.00000000' }
          }
        ]
      ]
    })
    expect(paths1.paths).toStrictEqual(paths2.paths)
  })

  it('should get correct swap path - 2 legs', async () => {
    const response = await controller.listPaths('1', '3') // A to C
    expect(response).toStrictEqual({
      fromToken: {
        id: '1',
        symbol: 'A',
        displaySymbol: 'dA'
      },
      toToken: {
        id: '3',
        symbol: 'C',
        displaySymbol: 'dC'
      },
      paths: [
        [
          {
            symbol: 'A-DFI',
            poolPairId: '13',
            priceRatio: { ab: '0.50000000', ba: '2.00000000' },
            tokenA: { id: '1', symbol: 'A', displaySymbol: 'dA' },
            tokenB: { id: '0', symbol: 'DFI', displaySymbol: 'DFI' }
          },
          {
            symbol: 'C-DFI',
            poolPairId: '15',
            priceRatio: { ab: '0.25000000', ba: '4.00000000' },
            tokenA: { id: '3', symbol: 'C', displaySymbol: 'dC' },
            tokenB: { id: '0', symbol: 'DFI', displaySymbol: 'DFI' }
          }
        ]
      ]
    })
  })

  it('should get correct swap path - 3 legs', async () => {
    const response = await controller.listPaths('7', '3') // G to C
    expect(response).toStrictEqual({
      fromToken: {
        id: '7',
        symbol: 'G',
        displaySymbol: 'dG'
      },
      toToken: {
        id: '3',
        symbol: 'C',
        displaySymbol: 'dC'
      },
      paths: [
        [
          {
            symbol: 'G-A',
            poolPairId: '19',
            priceRatio: { ab: '0.20000000', ba: '5.00000000' },
            tokenA: { id: '7', symbol: 'G', displaySymbol: 'dG' },
            tokenB: { id: '1', symbol: 'A', displaySymbol: 'dA' }
          },
          {
            symbol: 'A-DFI',
            poolPairId: '13',
            priceRatio: { ab: '0.50000000', ba: '2.00000000' },
            tokenA: { id: '1', symbol: 'A', displaySymbol: 'dA' },
            tokenB: { id: '0', symbol: 'DFI', displaySymbol: 'DFI' }
          },
          {
            symbol: 'C-DFI',
            poolPairId: '15',
            priceRatio: { ab: '0.25000000', ba: '4.00000000' },
            tokenA: { id: '3', symbol: 'C', displaySymbol: 'dC' },
            tokenB: { id: '0', symbol: 'DFI', displaySymbol: 'DFI' }
          }
        ]
      ]
    })
  })

  it('should get multiple swap paths', async () => {
    const response = await controller.listPaths('9', '11') // I to K
    expect(response).toStrictEqual({
      fromToken: {
        id: '9',
        symbol: 'I',
        displaySymbol: 'dI'
      },
      toToken: {
        id: '11',
        symbol: 'K',
        displaySymbol: 'dK'
      },
      paths: [
        [
          {
            symbol: 'I-J',
            poolPairId: '20',
            priceRatio: { ab: '0', ba: '0' },
            tokenA: { id: '9', symbol: 'I', displaySymbol: 'dI' },
            tokenB: { id: '10', symbol: 'J', displaySymbol: 'dJ' }
          },
          {
            symbol: 'J-L',
            poolPairId: '22',
            priceRatio: { ab: '0.50000000', ba: '2.00000000' },
            tokenA: { id: '10', symbol: 'J', displaySymbol: 'dJ' },
            tokenB: { id: '12', symbol: 'L', displaySymbol: 'dL' }
          },
          {
            symbol: 'L-K',
            poolPairId: '23',
            priceRatio: { ab: '0.25000000', ba: '4.00000000' },
            tokenA: { id: '12', symbol: 'L', displaySymbol: 'dL' },
            tokenB: { id: '11', symbol: 'K', displaySymbol: 'dK' }
          }
        ],
        [
          {
            symbol: 'I-J',
            poolPairId: '20',
            priceRatio: { ab: '0', ba: '0' },
            tokenA: { id: '9', symbol: 'I', displaySymbol: 'dI' },
            tokenB: { id: '10', symbol: 'J', displaySymbol: 'dJ' }
          },
          {
            symbol: 'J-K',
            poolPairId: '21',
            priceRatio: { ab: '0.14285714', ba: '7.00000000' },
            tokenA: { id: '10', symbol: 'J', displaySymbol: 'dJ' },
            tokenB: { id: '11', symbol: 'K', displaySymbol: 'dK' }
          }
        ]
      ]
    })
  })

  it('should handle cyclic swap paths', async () => {
    const response = await controller.listPaths('10', '11') // J to K
    expect(response).toStrictEqual({
      fromToken: {
        id: '10',
        symbol: 'J',
        displaySymbol: 'dJ'
      },
      toToken: {
        id: '11',
        symbol: 'K',
        displaySymbol: 'dK'
      },
      paths: [
        [
          {
            symbol: 'J-L',
            poolPairId: '22',
            priceRatio: { ab: '0.50000000', ba: '2.00000000' },
            tokenA: { id: '10', symbol: 'J', displaySymbol: 'dJ' },
            tokenB: { id: '12', symbol: 'L', displaySymbol: 'dL' }
          },
          {
            symbol: 'L-K',
            poolPairId: '23',
            priceRatio: { ab: '0.25000000', ba: '4.00000000' },
            tokenA: { id: '12', symbol: 'L', displaySymbol: 'dL' },
            tokenB: { id: '11', symbol: 'K', displaySymbol: 'dK' }
          }
        ],
        [
          {
            symbol: 'J-K',
            poolPairId: '21',
            priceRatio: { ab: '0.14285714', ba: '7.00000000' },
            tokenA: { id: '10', symbol: 'J', displaySymbol: 'dJ' },
            tokenB: { id: '11', symbol: 'K', displaySymbol: 'dK' }
          }
        ]
      ]
    })
  })

  it('should have no swap path - isolated token H', async () => {
    const response = await controller.listPaths('8', '1') // H to A impossible
    expect(response).toStrictEqual({
      fromToken: {
        id: '8',
        symbol: 'H',
        displaySymbol: 'dH'
      },
      toToken: {
        id: '1',
        symbol: 'A',
        displaySymbol: 'dA'
      },
      paths: []
    })
  })

  it('should throw error when fromToken === toToken', async () => {
    // DFI to DFI - forbid technically correct but redundant results,
    // e.g. [DFI -> A -> DFI], [DFI -> B -> DFI], etc.
    await expect(controller.listPaths('0', '0'))
      .rejects
      .toThrowError('Invalid tokens: fromToken must be different from toToken')
  })

  it('should throw error for invalid tokenId', async () => {
    await expect(controller.listPaths('-1', '1')).rejects.toThrowError('Unable to find token -1')
    await expect(controller.listPaths('1', '-1')).rejects.toThrowError('Unable to find token -1')
    await expect(controller.listPaths('100', '1')).rejects.toThrowError('Unable to find token 100')
    await expect(controller.listPaths('1', '100')).rejects.toThrowError('Unable to find token 100')
    await expect(controller.listPaths('-1', '100')).rejects.toThrowError('Unable to find token -1')
  })
})

describe('get list swappable tokens', () => {
  it('should list correct swappable tokens', async () => {
    const result = await controller.listSwappableTokens('1') // A
    expect(result).toStrictEqual({
      fromToken: { id: '1', symbol: 'A', displaySymbol: 'dA' },
      swappableTokens: [
        { id: '7', symbol: 'G', displaySymbol: 'dG' },
        { id: '0', symbol: 'DFI', displaySymbol: 'DFI' },
        { id: '26', symbol: 'USDT', displaySymbol: 'dUSDT' },
        { id: '6', symbol: 'F', displaySymbol: 'dF' },
        { id: '5', symbol: 'E', displaySymbol: 'dE' },
        { id: '4', symbol: 'D', displaySymbol: 'dD' },
        { id: '3', symbol: 'C', displaySymbol: 'dC' },
        { id: '2', symbol: 'B', displaySymbol: 'dB' }
      ]
    })
  })

  it('should not show status:false tokens', async () => {
    const result = await controller.listSwappableTokens('1') // A
    expect(result.swappableTokens.map(token => token.symbol))
      .not.toContain('BURN')
  })

  it('should list no tokens for token that is not swappable with any', async () => {
    const result = await controller.listSwappableTokens('8') // H
    expect(result).toStrictEqual({
      fromToken: { id: '8', symbol: 'H', displaySymbol: 'dH' },
      swappableTokens: []
    })
  })

  it('should throw error for invalid / non-existent tokenId', async () => {
    await expect(controller.listSwappableTokens('-1')).rejects.toThrowError('Unable to find token -1')
    await expect(controller.listSwappableTokens('100')).rejects.toThrowError('Unable to find token 100')
    await expect(controller.listSwappableTokens('a')).rejects.toThrowError('Unable to find token a')
  })
})

describe('latest dex prices', () => {
  it('should get latest dex prices - denomination: DFI', async () => {
    const result = await controller.listDexPrices('DFI')
    expect(result).toStrictEqual({
      denomination: { displaySymbol: 'DFI', id: '0', symbol: 'DFI' },
      dexPrices: {
        USDT: {
          token: { displaySymbol: 'dUSDT', id: '26', symbol: 'USDT' },
          denominationPrice: '0.43151288'
        },
        L: {
          token: { displaySymbol: 'dL', id: '12', symbol: 'L' },
          denominationPrice: '0'
        },
        K: {
          token: { displaySymbol: 'dK', id: '11', symbol: 'K' },
          denominationPrice: '0'
        },
        J: {
          token: { displaySymbol: 'dJ', id: '10', symbol: 'J' },
          denominationPrice: '0'
        },
        I: {
          token: { displaySymbol: 'dI', id: '9', symbol: 'I' },
          denominationPrice: '0'
        },
        H: {
          token: { displaySymbol: 'dH', id: '8', symbol: 'H' },
          denominationPrice: '0'
        },
        G: {
          token: { displaySymbol: 'dG', id: '7', symbol: 'G' },
          denominationPrice: '10.00000000'
        },
        F: {
          token: { displaySymbol: 'dF', id: '6', symbol: 'F' },
          denominationPrice: '0'
        },
        E: {
          token: { displaySymbol: 'dE', id: '5', symbol: 'E' },
          denominationPrice: '0'
        },
        D: {
          token: { displaySymbol: 'dD', id: '4', symbol: 'D' },
          denominationPrice: '0'
        },
        C: {
          token: { displaySymbol: 'dC', id: '3', symbol: 'C' },
          denominationPrice: '4.00000000'
        },
        B: {
          token: { displaySymbol: 'dB', id: '2', symbol: 'B' },
          denominationPrice: '6.00000000'
        },
        A: {
          token: { displaySymbol: 'dA', id: '1', symbol: 'A' },
          denominationPrice: '2.00000000'
        }
      }
    })
  })

  it('should get latest dex prices - denomination: USDT', async () => {
    const result = await controller.listDexPrices('USDT')
    expect(result).toStrictEqual({
      denomination: { displaySymbol: 'dUSDT', id: '26', symbol: 'USDT' },
      dexPrices: {
        DFI: {
          token: { displaySymbol: 'DFI', id: '0', symbol: 'DFI' },
          denominationPrice: '2.31742792' // 1 DFI = 2.31 USDT
        },
        A: {
          token: { displaySymbol: 'dA', id: '1', symbol: 'A' },
          denominationPrice: '4.63485584' // 1 A = 4.63 USDT
        },
        G: {
          token: { displaySymbol: 'dG', id: '7', symbol: 'G' },
          denominationPrice: '23.17427920' // 1 G = 5 A = 10 DFI = 23 USDT
        },
        B: {
          token: { displaySymbol: 'dB', id: '2', symbol: 'B' },
          denominationPrice: '13.90456752'
        },
        C: {
          token: { displaySymbol: 'dC', id: '3', symbol: 'C' },
          denominationPrice: '9.26971168'
        },
        L: {
          token: { displaySymbol: 'dL', id: '12', symbol: 'L' },
          denominationPrice: '0'
        },
        K: {
          token: { displaySymbol: 'dK', id: '11', symbol: 'K' },
          denominationPrice: '0'
        },
        J: {
          token: { displaySymbol: 'dJ', id: '10', symbol: 'J' },
          denominationPrice: '0'
        },
        I: {
          token: { displaySymbol: 'dI', id: '9', symbol: 'I' },
          denominationPrice: '0'
        },
        H: {
          token: { displaySymbol: 'dH', id: '8', symbol: 'H' },
          denominationPrice: '0'
        },
        F: {
          token: { displaySymbol: 'dF', id: '6', symbol: 'F' },
          denominationPrice: '0'
        },
        E: {
          token: { displaySymbol: 'dE', id: '5', symbol: 'E' },
          denominationPrice: '0'
        },
        D: {
          token: { displaySymbol: 'dD', id: '4', symbol: 'D' },
          denominationPrice: '0'
        }
      }
    })
  })

  it('should get consistent, mathematically sound dex prices - USDT and DFI', async () => {
    const pricesInUSDT = await controller.listDexPrices('USDT')
    const pricesInDFI = await controller.listDexPrices('DFI')

    // 1 DFI === x USDT
    // 1 USDT === 1/x DFI
    expect(new BigNumber(pricesInDFI.dexPrices.USDT.denominationPrice).toFixed(8))
      .toStrictEqual(
        new BigNumber(pricesInUSDT.dexPrices.DFI.denominationPrice)
          .pow(-1)
          .toFixed(8)
      )
    expect(pricesInDFI.dexPrices.USDT.denominationPrice).toStrictEqual('0.43151288')
    expect(pricesInUSDT.dexPrices.DFI.denominationPrice).toStrictEqual('2.31742792')
  })

  it('should get consistent, mathematically sound dex prices - A and B', async () => {
    // 1 A = n DFI
    // 1 B = m DFI
    // 1 DFI = 1/m B
    // hence 1 A = n DFI = n/m B
    const pricesInDFI = await controller.listDexPrices('DFI')
    const pricesInA = await controller.listDexPrices('A')
    const pricesInB = await controller.listDexPrices('B')

    // 1 A = n DFI
    const AInDfi = new BigNumber(pricesInDFI.dexPrices.A.denominationPrice) // n
    // 1 DFI = 1/n A
    const DFIInA = new BigNumber(pricesInA.dexPrices.DFI.denominationPrice)

    // Verify that B/DFI and DFI/B values are consistent between listPrices('DFI') and listPrices('A')
    expect(AInDfi.toFixed(8)).toStrictEqual(DFIInA.pow(-1).toFixed(8))
    expect(AInDfi.toFixed(8)).toStrictEqual('2.00000000')
    expect(DFIInA.toFixed(8)).toStrictEqual('0.50000000')

    // 1 B = m DFI
    const BInDfi = new BigNumber(pricesInDFI.dexPrices.B.denominationPrice) // m
    // 1 DFI = 1/m B
    const DFIInB = new BigNumber(pricesInB.dexPrices.DFI.denominationPrice)

    // Verify that B/DFI and DFI/B values are consistent between listPrices('DFI') and listPrices('B')
    expect(BInDfi.toFixed(6)).toStrictEqual(
      DFIInB.pow(-1).toFixed(6) // precision - 2 due to floating point imprecision
    )
    expect(BInDfi.toFixed(8)).toStrictEqual('6.00000000')
    expect(DFIInB.toFixed(8)).toStrictEqual('0.16666666')

    // Verify that the value of token A denoted in B (1 A = n/m B) is also returned by the endpoint
    expect(new BigNumber(pricesInB.dexPrices.A.denominationPrice).toFixed(7))
      .toStrictEqual(
        AInDfi.div(BInDfi).toFixed(7) // precision - 1 due to floating point imprecision
      )
    expect(AInDfi.div(BInDfi).toFixed(8)).toStrictEqual('0.33333333')
    expect(pricesInB.dexPrices.A.denominationPrice).toStrictEqual('0.33333332')
  })

  it('should list DAT tokens only - M (non-DAT token) is not included in result', async () => {
    { // M not included in any denominated dex prices
      const result = await controller.listDexPrices('DFI')
      expect(result.dexPrices.M).toBeUndefined()
    }

    { // M is not a valid 'denomination' token
      await expect(controller.listDexPrices('M'))
        .rejects
        .toThrowError('Could not find token with symbol \'M\'')
    }
  })

  it('should list DAT tokens only - status:false tokens are excluded', async () => {
    { // BURN not included in any denominated dex prices
      const result = await controller.listDexPrices('DFI')
      expect(result.dexPrices.BURN).toBeUndefined()
    }

    { // BURN is not a valid 'denomination' token
      await expect(controller.listDexPrices('BURN'))
        .rejects
        .toThrowError('Unexpected error: could not find token with symbol \'BURN\'')
    }
  })

  describe('param validation - denomination', () => {
    it('should throw error for invalid denomination', async () => {
      await expect(controller.listDexPrices('aaaaa')).rejects.toThrowError('Could not find token with symbol \'aaaaa\'')
      await expect(controller.listDexPrices('-1')).rejects.toThrowError('Could not find token with symbol \'-1\'')

      // endpoint is case-sensitive
      await expect(controller.listDexPrices('dfi')).rejects.toThrowError('Could not find token with symbol \'dfi\'')
    })
  })
})
