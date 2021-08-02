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
  const tokens = ['A', 'B', 'C', 'D', 'E', 'F']

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
}

describe('list', () => {
  it('should list', async () => {
    const response = await controller.list({
      size: 30
    })

    expect(response.data.length).toStrictEqual(7)
    expect(response.page).toBeUndefined()

    expect(response.data[1]).toStrictEqual({
      id: '8',
      symbol: 'B-DFI',
      name: 'B-Default Defi token',
      status: true,
      tokenA: {
        id: '2',
        reserve: '50',
        blockCommission: '0'
      },
      tokenB: {
        id: '0',
        reserve: '300',
        blockCommission: '0'
      },
      commission: '0',
      totalLiquidity: {
        token: '122.47448713',
        usd: '1390.456752'
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
    expect(first.data[0].symbol).toStrictEqual('A-DFI')
    expect(first.data[1].symbol).toStrictEqual('B-DFI')

    const next = await controller.list({
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(5)
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
      symbol: 'A-DFI',
      name: 'A-Default Defi token',
      status: true,
      tokenA: {
        id: expect.any(String),
        reserve: '100',
        blockCommission: '0'
      },
      tokenB: {
        id: expect.any(String),
        reserve: '200',
        blockCommission: '0'
      },
      commission: '0',
      totalLiquidity: {
        token: '141.42135623',
        usd: '926.971168'
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
