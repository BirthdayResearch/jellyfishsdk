import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubWhaleApiClient } from '../stub.client'
import { StubService } from '../stub.service'
import { ApiPagedResponse, WhaleApiClient, WhaleApiException } from '../../src'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens, poolSwap } from '@defichain/testing'
import { PoolPairData, PoolSwap, PoolSwapAggregated, PoolSwapAggregatedInterval } from '../../src/api/poolpairs'
import { Testing } from '@defichain/jellyfish-testing'

let container: MasterNodeRegTestContainer
let service: StubService
let client: WhaleApiClient
let testing: Testing

beforeEach(async () => {
  container = new MasterNodeRegTestContainer()
  service = new StubService(container)
  client = new StubWhaleApiClient(service)
  testing = Testing.create(container)

  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await service.start()

  await setup()
})

afterEach(async () => {
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
    await createToken(container, token, {
      collateralAddress: await testing.address('swap')
    })
    await mintTokens(container, token, {
      mintAmount: 10000
    })
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

  await createToken(container, 'USDC')
  await createPoolPair(container, 'USDC', 'H')
  await mintTokens(container, 'USDC')
  await addPoolLiquidity(container, {
    tokenA: 'USDC',
    amountA: 500,
    tokenB: 'H',
    amountB: 31.51288,
    shareAddress: await getNewAddress(container)
  })

  await createToken(container, 'DUSD')
  await createToken(container, 'TEST', {
    collateralAddress: await testing.address('swap')
  })
  await createPoolPair(container, 'TEST', 'DUSD', {
    commission: 0.002
  })
  await mintTokens(container, 'DUSD')
  await mintTokens(container, 'TEST')
  await addPoolLiquidity(container, {
    tokenA: 'TEST',
    amountA: 20,
    tokenB: 'DUSD',
    amountB: 100,
    shareAddress: await getNewAddress(container)
  })

  await testing.token.dfi({
    address: await testing.address('swap'),
    amount: 20
  })
}

describe('poolpair info', () => {
  it('should list', async () => {
    const response: ApiPagedResponse<PoolPairData> = await client.poolpairs.list(30)

    expect(response.length).toStrictEqual(11)
    expect(response.hasNext).toStrictEqual(false)

    expect(response[1]).toStrictEqual({
      id: '10',
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
        reward: 0,
        total: 0,
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
      rewardPct: '0',
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
    const first = await client.poolpairs.list(4)
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
    expect(last.length).toStrictEqual(3)
    expect(last.hasNext).toStrictEqual(false)
    expect(last.nextToken).toBeUndefined()

    expect(last[0].symbol).toStrictEqual('USDT-DFI')
    expect(last[1].symbol).toStrictEqual('USDC-H')
  })

  it('should get 9', async () => {
    const response: PoolPairData = await client.poolpairs.get('9')

    expect(response).toStrictEqual({
      id: '9',
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

  it('should get 20', async () => {
    const response: PoolPairData = await client.poolpairs.get('20')

    expect(response).toStrictEqual({
      id: '20',
      symbol: 'USDC-H',
      name: 'USDC-H',
      displaySymbol: 'dUSDC-dH',
      status: true,
      tokenA: {
        id: expect.any(String),
        symbol: 'USDC',
        reserve: '500',
        blockCommission: '0',
        displaySymbol: 'dUSDC'
      },
      tokenB: {
        id: '8',
        symbol: 'H',
        reserve: '31.51288',
        blockCommission: '0',
        displaySymbol: 'dH'
      },
      apr: {
        reward: 0,
        total: 0,
        commission: 0
      },
      commission: '0',
      totalLiquidity: {
        token: '125.52465893',
        usd: '1000'
      },
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      priceRatio: {
        ab: '15.86652822',
        ba: '0.06302576'
      },
      rewardPct: '0',
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

  it('should throw error as numeric string is expected', async () => {
    expect.assertions(2)
    try {
      await client.poolpairs.get('A-DFI')
    } catch (err: any) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 400,
        type: 'BadRequest',
        at: expect.any(Number),
        message: 'Validation failed (numeric string is expected)',
        url: '/v0.0/regtest/poolpairs/A-DFI'
      })
    }
  })

  it('should throw error while getting non-existent poolpair', async () => {
    expect.assertions(2)
    try {
      await client.poolpairs.get('999')
    } catch (err: any) {
      expect(err).toBeInstanceOf(WhaleApiException)
      expect(err.error).toStrictEqual({
        code: 404,
        type: 'NotFound',
        at: expect.any(Number),
        message: 'Unable to find poolpair',
        url: '/v0.0/regtest/poolpairs/999'
      })
    }
  })
})

describe('poolswap', () => {
  it('should show volume and swaps', async () => {
    await poolSwap(container, {
      from: await testing.address('swap'),
      tokenFrom: 'A',
      amountFrom: 25,
      to: await testing.address('swap'),
      tokenTo: 'DFI'
    })

    await poolSwap(container, {
      from: await testing.address('swap'),
      tokenFrom: 'A',
      amountFrom: 50,
      to: await testing.address('swap'),
      tokenTo: 'DFI'
    })

    await poolSwap(container, {
      from: await testing.address('swap'),
      tokenFrom: 'TEST',
      amountFrom: 10,
      to: await testing.address('swap'),
      tokenTo: 'DUSD'
    })

    const height = await container.getBlockCount()
    await container.generate(1)
    await service.waitForIndexedHeight(height)

    const response: ApiPagedResponse<PoolSwap> = await client.poolpairs.listPoolSwaps('9')
    expect(response.length).toStrictEqual(2)
    expect(response.hasNext).toStrictEqual(false)
    expect(response[0].fromAmount).toStrictEqual('50.00000000')
    expect(response[1].fromAmount).toStrictEqual('25.00000000')
    expect(response[0].fromTokenId).toStrictEqual(1)
    expect(response[1].fromTokenId).toStrictEqual(1)

    const poolPair: PoolPairData = await client.poolpairs.get('9')
    expect(poolPair).toStrictEqual({
      id: '9',
      symbol: 'A-DFI',
      displaySymbol: 'dA-DFI',
      name: 'A-Default Defi token',
      status: true,
      tokenA: {
        id: expect.any(String),
        symbol: 'A',
        reserve: '175',
        blockCommission: '0',
        displaySymbol: 'dA'
      },
      tokenB: {
        id: '0',
        symbol: 'DFI',
        reserve: '114.2857143',
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
        usd: '529.6978124963500510109100852'
      },
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      priceRatio: {
        ab: '1.53124999',
        ba: '0.65306122'
      },
      rewardPct: '0',
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      volume: {
        d30: 113.50667410636073,
        h24: 113.50667410636073
      }
    })

    const dusdPoolPair: PoolPairData = await client.poolpairs.get('23')
    expect(dusdPoolPair).toStrictEqual({
      id: '23',
      symbol: 'TEST-DUSD',
      displaySymbol: 'dTEST-DUSD',
      name: 'TEST-DUSD',
      status: true,
      tokenA: {
        id: expect.any(String),
        symbol: 'TEST',
        reserve: '29.98',
        blockCommission: '0',
        displaySymbol: 'dTEST'
      },
      tokenB: {
        id: expect.any(String),
        symbol: 'DUSD',
        reserve: '66.71114077',
        blockCommission: '0',
        displaySymbol: 'DUSD'
      },
      apr: {
        reward: 0,
        total: 0.12174783188792529,
        commission: 0.12174783188792529
      },
      commission: '0.002',
      totalLiquidity: {
        token: '44.72135954',
        usd: '133.42228154'
      },
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      priceRatio: {
        ab: '0.44940019',
        ba: '2.22518815'
      },
      rewardPct: '0',
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      volume: {
        d30: 22.25188151100734,
        h24: 22.25188151100734
      }
    })
  })
})

describe('poolswap 24h', () => {
  it('should show volume and swaps for 24h', async () => {
    await testing.generate(1)

    {
      const oneHour = 60 * 60
      const dateNow = new Date()
      dateNow.setUTCSeconds(0)
      dateNow.setUTCMinutes(2)
      dateNow.setUTCHours(0)
      dateNow.setUTCDate(dateNow.getUTCDate() + 2)
      const timeNow = Math.floor(dateNow.getTime() / 1000)
      for (let i = 0; i <= 24; i++) {
        const mockTime = timeNow + i * oneHour
        await testing.rpc.misc.setMockTime(mockTime)

        await testing.poolpair.swap({
          from: await testing.address('swap'),
          tokenFrom: 'A',
          amountFrom: 0.1,
          to: await testing.address('swap'),
          tokenTo: 'DFI'
        })

        await testing.generate(1)
      }

      const height = await container.getBlockCount()
      await testing.generate(1)
      await service.waitForIndexedHeight(height)
      await testing.generate(1)
    }

    const poolPair: PoolPairData = await client.poolpairs.get('9')
    expect(poolPair).toStrictEqual({
      id: '9',
      symbol: 'A-DFI',
      displaySymbol: 'dA-DFI',
      name: 'A-Default Defi token',
      status: true,
      tokenA: {
        id: expect.any(String),
        symbol: 'A',
        reserve: '102.5',
        blockCommission: '0',
        displaySymbol: 'dA'
      },
      tokenB: {
        id: '0',
        symbol: 'DFI',
        reserve: '195.12195134',
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
        usd: '904.36211934160574766567579176'
      },
      tradeEnabled: true,
      ownerAddress: expect.any(String),
      priceRatio: {
        ab: '0.52531249',
        ba: '1.90362879'
      },
      rewardPct: '0',
      creation: {
        tx: expect.any(String),
        height: expect.any(Number)
      },
      volume: {
        d30: 11.028806333434215,
        h24: 10.146501826759481
      }
    })
  })
})

describe('poolswap aggregated', () => {
  it('should show aggregated swaps for 24h and 30d', async () => {
    {
      const fiveMinutes = 60 * 5
      const numBlocks = 24 * 16 // 1.333 days
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
          tokenFrom: 'B',
          amountFrom: 0.1,
          to: await testing.address('swap'),
          tokenTo: 'DFI'
        })

        await testing.generate(1)
      }

      const height = await container.getBlockCount()
      await container.generate(1)
      await service.waitForIndexedHeight(height)
    }

    const dayAggregated: ApiPagedResponse<PoolSwapAggregated> = await client.poolpairs.listPoolSwapAggregates('10', PoolSwapAggregatedInterval.ONE_DAY, 10)
    expect([...dayAggregated]).toStrictEqual([
      {
        aggregated: {
          amounts: { 2: '9.50000000' }
        },
        block: expect.any(Object),
        bucket: expect.any(Number),
        id: expect.any(String),
        key:
        '10-86400'
      },
      {
        aggregated: {
          amounts: {
            2: '29.00000000'
          }
        },
        block: expect.any(Object),
        bucket: expect.any(Number),
        id: expect.any(String),
        key: '10-86400'
      },
      {
        aggregated: {
          amounts: {}
        },
        block: expect.any(Object),
        bucket: expect.any(Number),
        id: expect.any(String),
        key: '10-86400'
      }

    ])

    const hourAggregated: ApiPagedResponse<PoolSwapAggregated> = await client.poolpairs.listPoolSwapAggregates('10', PoolSwapAggregatedInterval.ONE_HOUR, 3)
    expect([...hourAggregated]).toStrictEqual([
      {
        aggregated: { amounts: { 2: '1.10000000' } },
        block: expect.any(Object),
        bucket: expect.any(Number),
        id: expect.any(String),
        key: '10-3600'
      },
      {
        aggregated: { amounts: { 2: '1.20000000' } },
        block: expect.any(Object),
        bucket: expect.any(Number),
        id: expect.any(String),
        key: '10-3600'
      },
      {
        aggregated: { amounts: { 2: '1.20000000' } },
        block: expect.any(Object),
        bucket: expect.any(Number),
        id: expect.any(String),
        key: '10-3600'
      }
    ])
  })
})
