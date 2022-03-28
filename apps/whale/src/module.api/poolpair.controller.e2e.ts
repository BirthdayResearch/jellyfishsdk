import { PoolPairController } from '@src/module.api/poolpair.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import { NotFoundException } from '@nestjs/common'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: PoolPairController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  controller = app.get(PoolPairController)

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
      size: 11,
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
          priceRatio: { ab: '0.00000000', ba: '0.00000000' },
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
      estimatedReturn: '0.00000000'
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
            priceRatio: { ab: '0.00000000', ba: '0.00000000' },
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
            priceRatio: { ab: '0.00000000', ba: '0.00000000' },
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
            priceRatio: { ab: '0.00000000', ba: '0.00000000' },
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
        { id: '24', symbol: 'USDT', displaySymbol: 'dUSDT' },
        { id: '6', symbol: 'F', displaySymbol: 'dF' },
        { id: '5', symbol: 'E', displaySymbol: 'dE' },
        { id: '4', symbol: 'D', displaySymbol: 'dD' },
        { id: '3', symbol: 'C', displaySymbol: 'dC' },
        { id: '2', symbol: 'B', displaySymbol: 'dB' }
      ]
    })
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
