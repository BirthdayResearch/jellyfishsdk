import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PoolPairController } from '@src/module.api/poolpair.controller'
import { createPoolPair, createToken, addPoolLiquidity, getNewAddress, mintTokens } from '@defichain/testing'
import { PoolPairInfoCache } from '@src/module.api/cache/poolpair.info.cache'
import { CacheModule, NotFoundException } from '@nestjs/common'
import BigNumber from 'bignumber.js'

const container = new MasterNodeRegTestContainer()
let controller: PoolPairController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  const client = new JsonRpcClient(await container.getCachedRpcUrl())

  const app: TestingModule = await Test.createTestingModule({
    imports: [
      CacheModule.register()
    ],
    controllers: [PoolPairController],
    providers: [
      { provide: JsonRpcClient, useValue: client },
      PoolPairInfoCache
    ]
  }).compile()

  controller = app.get(PoolPairController)

  const tokens = ['A', 'B', 'C', 'D', 'E', 'F']

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
    await mintTokens(container, token)
  }
  await createPoolPair(container, 'A', 'B')
  await createPoolPair(container, 'A', 'C')
  await createPoolPair(container, 'A', 'D')
  await createPoolPair(container, 'A', 'E')
  await createPoolPair(container, 'A', 'F')
  await createPoolPair(container, 'B', 'C')
  await createPoolPair(container, 'B', 'D')
  await createPoolPair(container, 'B', 'E')
  await container.generate(1)

  await addPoolLiquidity(container, {
    tokenA: 'A',
    amountA: 100,
    tokenB: 'B',
    amountB: 200,
    shareAddress: await getNewAddress(container)
  })
  await addPoolLiquidity(container, {
    tokenA: 'A',
    amountA: 50,
    tokenB: 'C',
    amountB: 300,
    shareAddress: await getNewAddress(container)
  })
  await addPoolLiquidity(container, {
    tokenA: 'A',
    amountA: 90,
    tokenB: 'D',
    amountB: 360,
    shareAddress: await getNewAddress(container)
  })
})

afterAll(async () => {
  await container.stop()
})

describe('list', () => {
  it('should list', async () => {
    const response = await controller.list({
      size: 30
    })

    expect(response.data.length).toBe(8)
    expect(response.page).toBeUndefined()

    expect(response.data[1]).toEqual({
      id: '8',
      symbol: 'A-C',
      name: 'A-C',
      status: true,
      tokenA: {
        id: '1',
        reserve: new BigNumber('50'),
        blockCommission: new BigNumber('0')
      },
      tokenB: {
        id: '3',
        reserve: new BigNumber('300'),
        blockCommission: new BigNumber('0')
      },
      commission: new BigNumber('0'),
      totalLiquidity: new BigNumber('122.47448713'),
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      rewardPct: new BigNumber('0'),
      customRewards: undefined,
      creation: {
        tx: expect.any(String),
        height: expect.any(BigNumber)
      }
    })
  })

  it('should list with pagination', async () => {
    const first = await controller.list({
      size: 2
    })
    expect(first.data.length).toBe(2)
    expect(first.page?.next).toBe('8')
    expect(first.data[0].symbol).toBe('A-B')
    expect(first.data[1].symbol).toBe('A-C')

    const next = await controller.list({
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toBe(6)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].symbol).toBe('A-D')
    expect(next.data[1].symbol).toBe('A-E')
    expect(next.data[2].symbol).toBe('A-F')
    expect(next.data[3].symbol).toBe('B-C')
    expect(next.data[4].symbol).toBe('B-D')
    expect(next.data[5].symbol).toBe('B-E')
  })

  it('should list with undefined next pagination', async () => {
    const first = await controller.list({
      size: 2,
      next: undefined
    })

    expect(first.data.length).toBe(2)
    expect(first.page?.next).toBe('8')
  })
})

describe('get', () => {
  it('should get', async () => {
    const response = await controller.get('7')

    expect(response).toEqual({
      id: '7',
      symbol: 'A-B',
      name: 'A-B',
      status: true,
      tokenA: {
        id: expect.any(String),
        reserve: new BigNumber('100'),
        blockCommission: new BigNumber('0')
      },
      tokenB: {
        id: expect.any(String),
        reserve: new BigNumber('200'),
        blockCommission: new BigNumber('0')
      },
      commission: new BigNumber('0'),
      totalLiquidity: new BigNumber('141.42135623'),
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      rewardPct: new BigNumber('0'),
      customRewards: undefined,
      creation: {
        tx: expect.any(String),
        height: expect.any(BigNumber)
      }
    })
  })

  it('should throw error while getting non-existent poolpair', async () => {
    await expect(controller.get('999')).rejects.toThrow(NotFoundException)
    await expect(controller.get('999')).rejects.toThrow('unable to find poolpair')
  })
})
