import { LegacyApiTesting } from '../../testing/LegacyApiTesting'
import { PoolPairData } from '@defichain/whale-api-client/src/api/PoolPairs'
import { SupportedNetwork } from 'apps/legacy-api/src/pipes/NetworkValidationPipe'
import { encodeBase64, SwapCacheFiller } from '../../src/controllers/PoolPairController'
import { waitForCondition } from '@defichain/testcontainers'

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
  const v1JsonResponse = res.json()
  for (const [key, poolpair] of Object.entries(v1JsonResponse)) {
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

  expect(v1JsonResponse.ETH_DFI).toStrictEqual({
    base_id: '1',
    base_name: 'ETH',
    base_symbol: 'ETH',
    quote_id: '0',
    quote_name: 'DFI',
    quote_symbol: 'DFI',
    last_price: expect.any(String),
    base_volume: expect.any(Number),
    quote_volume: expect.any(Number),
    isFrozen: expect.any(Number)
  })
})

it('/v2/listswaps', async () => {
  const res = await apiTesting.app.inject({
    method: 'GET',
    url: '/v2/listswaps'
  })

  // {
  //   ETH_DFI: {
  //     base_id: '1',
  //     base_name: 'ETH',
  //     ...
  //   },
  //   ...
  // }
  const v2JsonResponse = res.json()
  for (const [key, poolpair] of Object.entries(v2JsonResponse)) {
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

  expect(v2JsonResponse.ETH_DFI).toStrictEqual({
    base_id: '1',
    base_name: 'ETH',
    base_symbol: 'ETH',
    quote_id: '0',
    quote_name: 'DFI',
    quote_symbol: 'DFI',
    last_price: expect.any(String),
    base_volume: expect.any(Number),
    quote_volume: expect.any(Number),
    isFrozen: expect.any(Number)
  })

  expect(v2JsonResponse.ETH_DFI.last_price).not.toMatch('^0') // doesn't start with 0
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
      name: expect.any(String),
      pair: expect.any(String),
      logo: expect.any(String),
      poolRewards: expect.any(Array),
      pairLink: expect.any(String),
      totalStaked: expect.any(Number)
    })
  }

  expect(response).toStrictEqual({
    pools: expect.any(Array),
    provider: 'Defichain',
    tvl: expect.any(Number),
    provider_logo: 'https://defichain.com/downloads/symbol-defi-blockchain.svg',
    provider_URL: 'https://defichain.com',
    links: [
      {
        title: 'Twitter',
        link: 'https://twitter.com/defichain'
      },
      {
        title: 'YouTube',
        link: 'https://www.youtube.com/DeFiChain'
      },
      {
        title: 'Reddit',
        link: 'https://reddit.com/r/defiblockchain'
      },
      {
        title: 'Telegram',
        link: 'https://t.me/defiblockchain'
      },
      {
        title: 'LinkedIn',
        link: 'https://www.linkedin.com/company/defichain'
      },
      {
        title: 'Facebook',
        link: 'https://www.facebook.com/defichain.official'
      },
      {
        title: 'GitHub',
        link: 'https://github.com/DeFiCh'
      },
      {
        title: 'Discord',
        link: 'https://discord.com/invite/py55egyaGy'
      }
    ]
  })
})

describe('getsubgraphswaps', () => {
  it('/v1/getsubgraphswaps', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/getsubgraphswaps'
    })

    const response = res.json()

    expect(response.data.swaps.length).toStrictEqual(30)

    for (const swap of response.data.swaps) {
      expect(swap).toStrictEqual({
        id: expect.stringMatching(/[a-zA-Z0-9]{64}/),
        timestamp: expect.stringMatching(/\d+/),
        from: {
          symbol: expect.any(String),
          amount: expect.stringMatching(ONLY_DECIMAL_NUMBER_REGEX)
        },
        to: {
          symbol: expect.any(String),
          amount: expect.stringMatching(ONLY_DECIMAL_NUMBER_REGEX)
        }
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

  it('/v1/getsubgraphswaps?limit=101 - limited to 30', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/getsubgraphswaps?limit=101'
    })
    const response = res.json()
    expect(response.data.swaps.length).toStrictEqual(100)
  })

  it('should paginate', async () => {
    const [swap1And2, swap1]: any = await Promise.all([
      apiTesting.app.inject({
        method: 'GET',
        url: `/v1/getsubgraphswaps?limit=2&next=${encodeBase64({ height: '1757996', order: '0' })}`
      }).then(res => res.json()),

      apiTesting.app.inject({
        method: 'GET',
        url: `/v1/getsubgraphswaps?limit=1&next=${encodeBase64({ height: '1757996', order: '0' })}`
      }).then(res => res.json())
    ])

    const swap2 = (await apiTesting.app.inject({
      method: 'GET',
      url: `/v1/getsubgraphswaps?limit=1&next=${swap1.page.next as string}`
    })).json()

    expect(swap1.data.swaps[0]).toStrictEqual(swap1And2.data.swaps[0])
    expect(swap2.data.swaps[0]).toStrictEqual(swap1And2.data.swaps[1])
  })
})

describe('getsubgraphswaps - relying on caching', () => {
  beforeAll(async () => {
    // Given caching enabled and cache is filled sufficiently
    await waitForCondition(
      async () => apiTesting.app.get(SwapCacheFiller).isReady,
      30_000 // 30s
    )
  })

  it('/v1/getsubgraphswaps - should return 100 relatively quickly', async () => {
    // When getsubgraphswaps query is made
    const msStart = Date.now()
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/getsubgraphswaps?limit=100'
    })
    // Then response is returned relatively quickly: less than 500ms
    // As this test relies on production, avoid test flakiness due to network latency / ocean unavailable
    // Emit warning instead of failing
    const msElapsed = Date.now() - msStart
    expect(msElapsed).toBeLessThanOrEqual(3_000)
    if (msElapsed > 500) {
      console.warn(
        'legacy-api/getsubgraphswaps?limit=100: ' +
        `took ${msElapsed}ms (> 500ms) to get a response`
      )
    }

    // And number of swaps returned is correct
    const response = res.json()
    expect(response.data.swaps.length).toStrictEqual(100)

    // And all swaps have correct shape
    verifySwapsShape(response.data.swaps)

    // And swaps are ordered by timestamp
    verifySwapsOrdering(response.data.swaps, 'mainnet', 'desc')
  })
})

export function verifySwapsShape (swaps: any[]): void {
  const ONLY_DECIMAL_NUMBER_REGEX = /^[0-9]+(\.[0-9]+)?$/
  for (const swap of swaps) {
    expect(swap).toStrictEqual({
      id: expect.stringMatching(/[a-zA-Z0-9]{64}/),
      timestamp: expect.stringMatching(/\d+/),
      from: {
        symbol: expect.any(String),
        amount: expect.stringMatching(ONLY_DECIMAL_NUMBER_REGEX)
      },
      to: {
        symbol: expect.any(String),
        amount: expect.stringMatching(ONLY_DECIMAL_NUMBER_REGEX)
      }
    })
  }
}

export function verifySwapsOrdering (
  swaps: any[],
  network: SupportedNetwork,
  order: 'asc' | 'desc' = 'asc'
): void {
  // Since testsuite relies on mainnet / testnet, skip if fewer than 2 swaps
  if (swaps.length < 2) {
    console.warn(`No ${network} swaps found for this test run`)
    return
  }

  // Verify swaps are ordered by timestamp in ascending order

  if (order === 'asc') {
    for (let i = 1; i < swaps.length; i++) {
      const swap1 = swaps[i - 1]
      const swap2 = swaps[i]
      expect(Number(swap1.timestamp)).toBeLessThanOrEqual(Number(swap2.timestamp))
    }
  } else {
    for (let i = 1; i < swaps.length; i++) {
      const swap1 = swaps[i - 1]
      const swap2 = swaps[i]
      expect(Number(swap1.timestamp)).toBeGreaterThanOrEqual(Number(swap2.timestamp))
    }
  }
}
