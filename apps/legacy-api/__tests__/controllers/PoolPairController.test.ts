import { LegacyApiTesting } from '../../testing/LegacyApiTesting'
import { PoolPairData } from '@defichain/whale-api-client/dist/api/poolpairs'

const ONLY_DECIMAL_NUMBER_REGEX = /^[0-9]+(\.[0-9]+)?$/

const apiTesting = LegacyApiTesting.create()

beforeAll(async () => {
  await apiTesting.start()
})

afterAll(async () => {
  await apiTesting.stop()
})

it('/v1/getpoolpair?id=4', async () => {
  const res = await apiTesting.app.inject({
    method: 'GET',
    url: '/v1/getpoolpair?id=4'
  })

  const poolpair: PoolPairData = res.json()
  expect(poolpair).toStrictEqual({
    symbol: expect.any(String),
    name: expect.any(String),
    status: expect.any(Boolean),
    idTokenA: expect.any(String),
    idTokenB: expect.any(String),
    reserveA: expect.any(String),
    reserveB: expect.any(String),
    commission: expect.any(Number),
    totalLiquidity: expect.any(Number),
    'reserveA/reserveB': expect.any(Number),
    'reserveB/reserveA': expect.any(Number),
    tradeEnabled: expect.any(Boolean),
    ownerAddress: expect.any(String),
    blockCommissionA: expect.any(Number),
    blockCommissionB: expect.any(Number),
    rewardPct: expect.any(Number),
    creationTx: expect.any(String),
    creationHeight: expect.any(Number),
    totalLiquidityLpToken: expect.any(String),
    tokenASymbol: expect.any(String),
    tokenBSymbol: expect.any(String)
  })
})

it('/v1/listpoolpairs', async () => {
  const res = await apiTesting.app.inject({
    method: 'GET',
    url: '/v1/listpoolpairs'
  })
  const poolpairs: PoolPairData[] = res.json()

  expect(Object.entries(poolpairs).length).toBeGreaterThan(0)
  for (const [key, poolpair] of Object.entries(poolpairs)) {
    expect(key).toStrictEqual(expect.any(String))
    expect(poolpair).toStrictEqual({
      symbol: expect.any(String),
      name: expect.any(String),
      status: expect.any(Boolean),
      idTokenA: expect.any(String),
      idTokenB: expect.any(String),
      reserveA: expect.any(String),
      reserveB: expect.any(String),
      commission: expect.any(Number),
      totalLiquidity: expect.any(Number),
      'reserveA/reserveB': expect.any(Number),
      'reserveB/reserveA': expect.any(Number),
      tradeEnabled: expect.any(Boolean),
      ownerAddress: expect.any(String),
      blockCommissionA: expect.any(Number),
      blockCommissionB: expect.any(Number),
      rewardPct: expect.any(Number),
      creationTx: expect.any(String),
      creationHeight: expect.any(Number),
      totalLiquidityLpToken: expect.any(String),
      tokenASymbol: expect.any(String),
      tokenBSymbol: expect.any(String)
    })
  }
})

it('/v1/listswaps', async () => {
  const res = await apiTesting.app.inject({
    method: 'GET',
    url: '/v1/listswaps'
  })

  // {
  //   ETH_DFI: {
  //     base_id: '1',
  //     base_name: 'ETH',
  //     ...
  //   },
  //   ...
  // }
  for (const [key, poolpair] of Object.entries(res.json())) {
    // Verify all keys follow snake case
    expect(key).toMatch(/^\w+_\w+$/)

    // Verify each swap object's fields
    expect(poolpair).toStrictEqual({
      base_id: expect.any(String),
      base_name: expect.any(String),
      base_symbol: expect.any(String),
      base_volume: expect.any(Number),
      isFrozen: expect.any(Number),
      last_price: expect.stringMatching(ONLY_DECIMAL_NUMBER_REGEX),
      quote_id: expect.stringMatching(/\d+/),
      quote_name: expect.any(String),
      quote_symbol: expect.any(String),
      quote_volume: expect.any(Number)
    })
  }
})

describe('getsubgraphswaps', () => {
  it('/v1/getsubgraphswaps', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      // TODO(eli-lim): temporary deployed TestNet for testing, to switch to mainnet
      url: '/v1/getsubgraphswaps?network=testnet'
    })

    const response = res.json()

    console.log(response)

    expect(response.data.swaps.length).toStrictEqual(100)

    for (const swap of response.data.swaps) {
      expect(swap).toStrictEqual({
        id: expect.stringMatching(/[a-zA-Z0-9]{64}/),
        pair: {
          fromToken: {
            decimals: 8,
            symbol: expect.any(String),
            tradeVolume: expect.stringMatching(/^[0-9]+(\.[0-9]{8})?$/)
          },
          toToken: {
            decimals: 8,
            symbol: expect.any(String),
            tradeVolume: expect.stringMatching(/^[0-9]+(\.[0-9]{8})?$/)
          }
        },
        timestamp: expect.stringMatching(/\d+/),
        fromAmount: expect.stringMatching(ONLY_DECIMAL_NUMBER_REGEX),
        toAmount: 'TODO' // TODO(eli-lim)
      })
    }
  })

  it('/v1/getsubgraphswaps?limit=3', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/getsubgraphswaps?limit=3'
    })
    const response = res.json()
    expect(response.data.swaps.length).toStrictEqual(3)
  })

  it('/v1/getsubgraphswaps?limit=-1', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/getsubgraphswaps?limit=-1'
    })
    const response = res.json()
    expect(response.data.swaps.length).toStrictEqual(0)
  })

  it('/v1/getsubgraphswaps?limit=101', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/getsubgraphswaps?limit=101'
    })
    const response = res.json()
    expect(response.data.swaps.length).toStrictEqual(100)
  })
})
