import { LegacyApiTesting } from '../../testing/LegacyApiTesting'
import { Test } from '@nestjs/testing'
import { WhaleApiClientProvider } from '../../src/providers/WhaleApiClientProvider'
import { MainnetLegacyStatsProvider, TestnetLegacyStatsProvider } from '../../src/controllers/stats/LegacyStatsProvider'

describe('StatsController', () => {
  const apiTesting = LegacyApiTesting.create()

  beforeAll(async () => {
    await apiTesting.start()
  })

  afterAll(async () => {
    await apiTesting.stop()
  })

  it('/v1/stats', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/stats'
    })

    const expected = {
      chain: 'main',
      blockHeight: expect.any(Number),
      bestBlockHash: expect.any(String),
      difficulty: expect.any(String),
      medianTime: expect.any(Number),

      burnInfo: {
        address: '8defichainBurnAddressXXXXXXXdRQkSm',
        amount: expect.any(String),
        tokens: expect.arrayContaining(
          [expect.stringMatching(/\d+\.?\d+@\w+/)] // ['123@BTC', '10.8@DFI', ...]
        ),
        feeburn: expect.any(Number),
        auctionburn: expect.any(Number),
        paybackburn: expect.any(String),
        dexfeetokens: expect.arrayContaining(
          [expect.stringMatching(/\d+\.?\d+@\w+/)] // ['123@BTC', '10.8@DFI', ...]
        ),
        dfipaybackfee: expect.any(Number),
        dfipaybacktokens: expect.arrayContaining([expect.any(String)]),
        emissionburn: expect.any(String),
        dfip2203: expect.arrayContaining(
          [expect.stringMatching(/\d+\.?\d+@\w+/)] // ['123@BTC', '10.8@DFI', ...]
        ),
        dfip2206f: expect.any(Array)
      },

      timeStamp: expect.any(Number),

      tokens: {
        max: 1200000000,
        supply: {
          total: expect.any(Number),
          circulation: expect.any(Number),
          foundation: 0,
          community: expect.any(Number)
        },
        initDist: { // initial distribution - fixed values
          total: 588000000,
          totalPercent: 49,
          foundation: 288120000,
          foundationPercent: 49,
          circulation: 49,
          circulationPercent: 51
        }
      },
      rewards: {
        // fixed values
        anchorPercent: 0.05,
        liquidityPoolPercent: 22.5,
        communityPercent: 9.95,
        anchorReward: 0.1,
        liquidityPool: 45,

        // each value is multiplied by calculated blockSubsidy
        total: expect.any(Number),
        minter: expect.any(Number),
        masternode: expect.any(Number),
        community: expect.any(Number),
        anchor: expect.any(Number),
        liquidity: expect.any(Number),
        swap: expect.any(Number),
        futures: expect.any(Number),
        options: expect.any(Number),
        unallocated: expect.any(Number)
      },
      listCommunities: {
        AnchorReward: expect.any(Number),
        Burnt: expect.any(String) // numeric string
      }
    }

    const actual = res.json()
    expect(actual).toStrictEqual(expected)

    // Additional checks
    expect(actual.rewards.minter).toStrictEqual(actual.rewards.masternode)
    expect(res.headers['content-type']).toStrictEqual('application/json; charset=utf-8')
  })

  it('/v1/stats?q=rewards - returns nested object', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/stats?q=rewards'
    })

    expect(res.json()).toStrictEqual({
      anchorPercent: expect.any(Number),
      liquidityPoolPercent: expect.any(Number),
      communityPercent: expect.any(Number),
      anchorReward: expect.any(Number),
      liquidityPool: expect.any(Number),
      total: expect.any(Number),
      minter: expect.any(Number),
      masternode: expect.any(Number),
      community: expect.any(Number),
      anchor: expect.any(Number),
      liquidity: expect.any(Number),
      swap: expect.any(Number),
      futures: expect.any(Number),
      options: expect.any(Number),
      unallocated: expect.any(Number)
    })
    expect(res.headers['content-type']).toStrictEqual('application/json; charset=utf-8')
  })

  it('/v1/stats?q=tokens.supply.total - returns text (leaf)', async () => {
    const res = await apiTesting.app.inject({
      method: 'GET',
      url: '/v1/stats?q=tokens.supply.total'
    })

    expect(Number(res.body)).toStrictEqual(expect.any(Number))
    expect(res.headers['content-type']).toStrictEqual('text; charset=utf-8')
  })
})

describe('MainnetLegacyStatsProvider', () => {
  let mainnetLegacyStatsProvider: MainnetLegacyStatsProvider

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MainnetLegacyStatsProvider, WhaleApiClientProvider]
    }).compile()
    mainnetLegacyStatsProvider = moduleRef.get(MainnetLegacyStatsProvider)
  })

  it('calculateBlockSubsidy returns the correct blockSubsidy value', () => {
    expect([
      mainnetLegacyStatsProvider.calculateBlockSubsidy(1),
      mainnetLegacyStatsProvider.calculateBlockSubsidy(1_000_000),
      mainnetLegacyStatsProvider.calculateBlockSubsidy(10_000_000)
    ])
      .toStrictEqual([
        200,
        385.22549644,
        3.88105736
      ])
  })
})

describe('TestnetLegacyStatsProvider', () => {
  let testnetLegacyStatsProvider: TestnetLegacyStatsProvider

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [TestnetLegacyStatsProvider, WhaleApiClientProvider]
    }).compile()
    testnetLegacyStatsProvider = moduleRef.get(TestnetLegacyStatsProvider)
  })

  it('calculateBlockSubsidy returns the correct blockSubsidy value', () => {
    expect([
      testnetLegacyStatsProvider.calculateBlockSubsidy(1),
      testnetLegacyStatsProvider.calculateBlockSubsidy(1_000_000),
      testnetLegacyStatsProvider.calculateBlockSubsidy(10_000_000)
    ])
      .toStrictEqual([
        200,
        294.80823155,
        2.92087984
      ])
  })
})
