import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { ApiPagedResponse, WhaleApiClient, WhaleApiException } from '../../src'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import { PoolPairService } from '@src/module.api/poolpair.service'
import { PoolPairData } from '@whale-api-client/api/poolpair'
import waitForExpect from 'wait-for-expect'

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

  await setup()

  await waitForExpect(() => {
    // @ts-expect-error
    expect(service.app?.get(PoolPairService).USDT_PER_DFI).toBeDefined()
  }, 61000) // 60 seconds interval
})

afterAll(async () => {
  try {
    await service.stop()
  } finally {
    await container.stop()
  }
})

async function setup (): Promise<void> {
  const tokens = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

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
  await createPoolPair(container, 'G', 'DFI')
  await createPoolPair(container, 'H', 'DFI')

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
    const response: ApiPagedResponse<PoolPairData> = await client.poolpair.list(30)

    expect(response.length).toStrictEqual(9)
    expect(response.hasNext).toStrictEqual(false)

    expect(response[1]).toStrictEqual({
      id: '10',
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
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      }
    })
  })

  it('should list with pagination', async () => {
    const first = await client.poolpair.list(4)
    expect(first.length).toStrictEqual(4)
    expect(first.hasNext).toStrictEqual(true)
    expect(first.nextToken).toStrictEqual('12')

    expect(first[0].symbol).toStrictEqual('A-DFI')
    expect(first[1].symbol).toStrictEqual('B-DFI')
    expect(first[2].symbol).toStrictEqual('C-DFI')
    expect(first[3].symbol).toStrictEqual('D-DFI')

    const next = await client.paginate(first)
    expect(next.length).toStrictEqual(4)
    expect(next.hasNext).toStrictEqual(true)
    expect(next.nextToken).toStrictEqual('16')

    expect(next[0].symbol).toStrictEqual('E-DFI')
    expect(next[1].symbol).toStrictEqual('F-DFI')
    expect(next[2].symbol).toStrictEqual('G-DFI')
    expect(next[3].symbol).toStrictEqual('H-DFI')

    const last = await client.paginate(next)
    expect(last.length).toStrictEqual(1)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()

    expect(last[0].symbol).toStrictEqual('USDT-DFI')
  })
})

describe('get', () => {
  it('should get', async () => {
    const response: PoolPairData = await client.poolpair.get('9')

    expect(response).toStrictEqual({
      id: '9',
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
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      }
    })
  })

  it('should throw error as numeric string is expected', async () => {
    expect.assertions(2)
    try {
      await client.poolpair.get('A-DFI')
    } catch (err) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        at: expect.any(Number),
        message: 'Validation failed (numeric string is expected)',
        url: '/v0/regtest/poolpairs/A-DFI'
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
        url: '/v0/regtest/poolpairs/999'
      })
    }
  })
})
