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

it('/v1/listyieldfarming', async () => {
  const res = await apiTesting.app.inject({
    method: 'GET',
    url: '/v1/listyieldfarming'
  })
  const response = res.json()

  // Verify 'pools' shape
  for (const pool of response.pools.values()) {
    expect(pool).toStrictEqual({
      apr: expect.any(Number),
      commission: expect.any(Number),
      name: expect.any(String),
      pair: expect.any(String),
      logo: expect.any(String),
      poolRewards: expect.any(Array),
      pairLink: expect.any(String),
      apy: expect.any(Number),
      idTokenA: expect.any(String),
      idTokenB: expect.any(String),
      totalStaked: expect.any(Number),
      poolPairId: expect.any(String),
      reserveA: expect.any(Number),
      reserveB: expect.any(Number),
      volumeA: expect.any(Number),
      volumeB: expect.any(Number),
      tokenASymbol: expect.any(String),
      tokenBSymbol: expect.any(String),
      priceA: expect.any(Number),
      priceB: expect.any(Number),
      volumeA30: expect.any(Number),
      volumeB30: expect.any(Number)
    })
  }

  expect(response).toStrictEqual({
    pools: expect.any(Array),
    provider: 'Defichain',
    tvl: expect.any(Number),
    provider_logo: 'https://defichain.com/downloads/symbol-defi-blockchain.svg',
    provider_URL: 'https://defichain.com',
    links: [
      { title: 'Twitter', link: 'https://twitter.com/defichain' },
      { title: 'YouTube', link: 'https://www.youtube.com/DeFiChain' },
      { title: 'Reddit', link: 'https://reddit.com/r/defiblockchain' },
      { title: 'Telegram', link: 'https://t.me/defiblockchain' },
      { title: 'LinkedIn', link: 'https://www.linkedin.com/company/defichain' },
      { title: 'Facebook', link: 'https://www.facebook.com/defichain.foundation' },
      { title: 'GitHub', link: 'https://github.com/DeFiCh/ain' }
    ]
  })
})
