import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { WhaleApiClient, WhaleApiException } from '../../src'
import { createPoolPair, createToken, addPoolLiquidity, getNewAddress, mintTokens } from '@defichain/testing'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient

beforeAll(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)

  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

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
  await container.generate(1)
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

describe('list', () => {
  it('should list', async () => {
    const response = await client.poolpair.list(30)

    expect(response.length).toStrictEqual(8)
    expect(response.hasNext).toStrictEqual(false)

    expect(response[1]).toStrictEqual({
      id: '8',
      symbol: 'A-C',
      name: 'A-C',
      status: true,
      tokenA: {
        id: '1',
        reserve: 50,
        blockCommission: 0
      },
      tokenB: {
        id: '3',
        reserve: 300,
        blockCommission: 0
      },
      commission: 0,
      totalLiquidity: 122.47448713,
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      rewardPct: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      }
    })
  })

  it('should list with pagination', async () => {
    const first = await client.poolpair.list(3)
    expect(first.length).toStrictEqual(3)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual('9')

    expect(first[0].symbol).toStrictEqual('A-B')
    expect(first[1].symbol).toStrictEqual('A-C')
    expect(first[2].symbol).toStrictEqual('A-D')

    const next = await client.paginate(first)
    expect(next.length).toStrictEqual(3)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual('12')

    expect(next[0].symbol).toStrictEqual('A-E')
    expect(next[1].symbol).toStrictEqual('A-F')
    expect(next[2].symbol).toStrictEqual('B-C')

    const last = await client.paginate(next)
    expect(last.length).toStrictEqual(2)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()

    expect(last[0].symbol).toStrictEqual('B-D')
    expect(last[1].symbol).toStrictEqual('B-E')
  })
})

describe('get', () => {
  it('should get', async () => {
    const response = await client.poolpair.get('7')

    expect(response).toStrictEqual({
      id: '7',
      symbol: 'A-B',
      name: 'A-B',
      status: true,
      tokenA: {
        id: expect.any(String),
        reserve: 100,
        blockCommission: 0
      },
      tokenB: {
        id: expect.any(String),
        reserve: 200,
        blockCommission: 0
      },
      commission: 0,
      totalLiquidity: 141.42135623,
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      rewardPct: 0,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      }
    })
  })

  it('should throw error as numeric string is expected', async () => {
    expect.assertions(2)
    try {
      await client.poolpair.get('A-B')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        at: expect.any(Number),
        message: 'Validation failed (numeric string is expected)',
        url: '/v1/regtest/poolpairs/A-B'
      })
    }
  })

  it('should throw error while getting non-existent poolpair', async () => {
    expect.assertions(2)
    try {
      await client.poolpair.get('999')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find poolpair',
        url: '/v1/regtest/poolpairs/999'
      })
    }
  })
})
