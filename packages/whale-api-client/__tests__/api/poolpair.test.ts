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

    expect(response.length).toBe(8)
    expect(response.hasNext).toBe(false)

    expect(response[1]).toEqual({
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
      customRewards: undefined,
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      }
    })
  })

  it('should list with pagination', async () => {
    const first = await client.poolpair.list(3)
    expect(first.length).toBe(3)
    expect(first.hasNext).toBe(true)
    expect(first.nextToken).toBe('9')

    expect(first[0].symbol).toBe('A-B')
    expect(first[1].symbol).toBe('A-C')
    expect(first[2].symbol).toBe('A-D')

    const next = await client.paginate(first)
    expect(next.length).toBe(3)
    expect(next.hasNext).toBe(true)
    expect(next.nextToken).toBe('12')

    expect(next[0].symbol).toBe('A-E')
    expect(next[1].symbol).toBe('A-F')
    expect(next[2].symbol).toBe('B-C')

    const last = await client.paginate(next)
    expect(last.length).toBe(2)
    expect(last.hasNext).toBe(false)
    expect(last.nextToken).toBeUndefined()

    expect(last[0].symbol).toBe('B-D')
    expect(last[1].symbol).toBe('B-E')
  })
})

describe('get', () => {
  it('should get', async () => {
    const response = await client.poolpair.get('7')

    expect(response).toEqual({
      id: 7,
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
    await expect(client.poolpair.get('A-B')).rejects.toThrow(WhaleApiException)
    await expect(client.poolpair.get('A-B')).rejects.toThrow('Validation failed (numeric string is expected)')
  })

  it('should throw error while getting non-existent poolpair', async () => {
    await expect(client.poolpair.get('999')).rejects.toThrow(WhaleApiException)
    await expect(client.poolpair.get('999')).rejects.toThrow('unable to find poolpair')
  })
})
