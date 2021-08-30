import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairController } from '@src/module.api/poolpair.controller'
import { PoolPairService } from '@src/module.api/poolpair.service'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import { CacheModule, NotFoundException } from '@nestjs/common'
import { DeFiDCache } from './cache/defid.cache'
import { ConfigService } from '@nestjs/config'
import { SemaphoreCache } from '@src/module.api/cache/semaphore.cache'

const container = new MasterNodeRegTestContainer()
let controller: PoolPairController

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  const client = new JsonRpcClient(await container.getCachedRpcUrl())

  const app: TestingModule = await Test.createTestingModule({
    imports: [
      CacheModule.register()
    ],
    controllers: [PoolPairController],
    providers: [
      { provide: JsonRpcClient, useValue: client },
      DeFiDCache,
      SemaphoreCache,
      PoolPairService,
      ConfigService
    ]
  }).compile()

  controller = app.get(PoolPairController)

  await setup()
})

afterAll(async () => {
  await container.stop()
})

async function setup (): Promise<void> {
  const tokens = ['USDT', 'B', 'C', 'D', 'E', 'F']

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
    await mintTokens(container, token)
  }

  for (const token of tokens) {
    await createPoolPair(container, token, 'DFI')
  }

  await addPoolLiquidity(container, {
    tokenA: 'USDT',
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
  await addPoolLiquidity(container, {
    tokenA: 'D',
    amountA: 51.1,
    tokenB: 'DFI',
    amountB: 144.54134,
    shareAddress: await getNewAddress(container)
  })
}

it('should resolve tvl for all poolpair', async () => {
  const response = await controller.list({ size: 5 })

  expect(response.data[0].totalLiquidity).toStrictEqual({
    token: '141.42135623',
    usd: '200'
  })

  expect(response.data[1].totalLiquidity).toStrictEqual({
    token: '122.47448713',
    usd: '300'
  })

  expect(response.data[2].totalLiquidity).toStrictEqual({
    token: '180',
    usd: '360'
  })

  expect(response.data[3].totalLiquidity).toStrictEqual({
    token: '85.94220426',
    usd: '144.54134'
  })

  expect(response.data[4].totalLiquidity).toStrictEqual({
    token: '0',
    usd: '0'
  })
})

describe('list', () => {
  it('should list', async () => {
    const response = await controller.list({
      size: 30
    })

    expect(response.data.length).toStrictEqual(6)
    expect(response.page).toBeUndefined()

    expect(response.data[1]).toStrictEqual({
      id: '8',
      symbol: 'B-DFI',
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
        reward: 0,
        total: 0
      },
      commission: '0',
      totalLiquidity: {
        token: '122.47448713',
        usd: '300'
      },
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      priceRatio: {
        ab: '0.16666666',
        ba: '6'
      },
      rewardPct: '0',
      customRewards: undefined,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      }
    })
  })

  it('should list with pagination', async () => {
    const first = await controller.list({
      size: 2
    })
    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('8')
    expect(first.data[0].symbol).toStrictEqual('USDT-DFI')
    expect(first.data[1].symbol).toStrictEqual('B-DFI')

    const next = await controller.list({
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(4)
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
    expect(first.page?.next).toStrictEqual('8')
  })
})

describe('get', () => {
  it('should get', async () => {
    const response = await controller.get('7')

    expect(response).toStrictEqual({
      id: '7',
      symbol: 'USDT-DFI',
      name: 'USDT-Default Defi token',
      status: true,
      tokenA: {
        id: expect.any(String),
        symbol: 'USDT',
        reserve: '100',
        blockCommission: '0',
        displaySymbol: 'dUSDT'
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
        total: 0
      },
      commission: '0',
      totalLiquidity: {
        token: '141.42135623',
        usd: '200'
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
