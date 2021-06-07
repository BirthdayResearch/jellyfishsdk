import { PoolPairController } from '@src/module.api/poolpair.controller'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { createPoolPair, createToken, addPoolLiquidity, getNewAddress, mintTokens } from '@defichain/testing'
import { NotFoundException } from '@nestjs/common'
import BigNumber from 'bignumber.js'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication
let controller: PoolPairController

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  controller = app.get(PoolPairController)

  await waitForIndexedHeight(app, 100)

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
  await stopTestingApp(container, app)
})

describe('list', () => {
  it('should list', async () => {
    const response = await controller.list({
      size: 30
    })

    expect(response.data.length).toStrictEqual(8)
    expect(response.page).toBeUndefined()

    expect(response.data[1]).toStrictEqual({
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
    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('8')
    expect(first.data[0].symbol).toStrictEqual('A-B')
    expect(first.data[1].symbol).toStrictEqual('A-C')

    const next = await controller.list({
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(6)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].symbol).toStrictEqual('A-D')
    expect(next.data[1].symbol).toStrictEqual('A-E')
    expect(next.data[2].symbol).toStrictEqual('A-F')
    expect(next.data[3].symbol).toStrictEqual('B-C')
    expect(next.data[4].symbol).toStrictEqual('B-D')
    expect(next.data[5].symbol).toStrictEqual('B-E')
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
