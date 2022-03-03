import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { StubWhaleApiClient } from '../stub.client'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { Testing } from '@defichain/jellyfish-testing'

describe('oracles', () => {
  let container: MasterNodeRegTestContainer
  let service: StubService
  let rpcClient: JsonRpcClient
  let apiClient: WhaleApiClient

  beforeAll(async () => {
    container = new MasterNodeRegTestContainer()
    service = new StubService(container)
    apiClient = new StubWhaleApiClient(service)

    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()

    rpcClient = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
  })

  interface OracleSetup {
    id: string
    address: string
    weightage: number
    feed: Array<{ token: string, currency: string }>
    prices: Array<Array<{ tokenAmount: string, currency: string }>>
  }

  const setups: Record<string, OracleSetup> = {
    a: {
      id: undefined as any,
      address: undefined as any,
      weightage: 1,
      feed: [
        { token: 'TA', currency: 'USD' },
        { token: 'TB', currency: 'USD' },
        { token: 'TC', currency: 'USD' },
        { token: 'TD', currency: 'USD' }
      ],
      prices: [
        [
          { tokenAmount: '1.1@TA', currency: 'USD' },
          { tokenAmount: '2.1@TB', currency: 'USD' },
          { tokenAmount: '3.1@TC', currency: 'USD' },
          { tokenAmount: '4.1@TD', currency: 'USD' }
        ],
        [
          { tokenAmount: '1@TA', currency: 'USD' },
          { tokenAmount: '2@TB', currency: 'USD' },
          { tokenAmount: '3@TC', currency: 'USD' }
        ],
        [
          { tokenAmount: '0.9@TA', currency: 'USD' },
          { tokenAmount: '1.9@TB', currency: 'USD' }
        ]
      ]
    },
    b: {
      id: undefined as any,
      address: undefined as any,
      weightage: 2,
      feed: [
        { token: 'TA', currency: 'USD' },
        { token: 'TB', currency: 'USD' },
        { token: 'TD', currency: 'USD' }
      ],
      prices: [
        [
          { tokenAmount: '1.5@TA', currency: 'USD' },
          { tokenAmount: '2.5@TB', currency: 'USD' },
          { tokenAmount: '4.5@TD', currency: 'USD' }
        ],
        [
          { tokenAmount: '1.5@TA', currency: 'USD' },
          { tokenAmount: '2.5@TB', currency: 'USD' },
          { tokenAmount: '4.5@TD', currency: 'USD' }
        ]
      ]
    },
    c: {
      id: undefined as any,
      address: undefined as any,
      weightage: 0,
      feed: [
        { token: 'TA', currency: 'USD' },
        { token: 'TB', currency: 'USD' },
        { token: 'TC', currency: 'USD' }
      ],
      prices: [
        [
          { tokenAmount: '1.25@TA', currency: 'USD' },
          { tokenAmount: '2.25@TB', currency: 'USD' },
          { tokenAmount: '4.25@TC', currency: 'USD' }
        ]
      ]
    }
  }

  beforeAll(async () => {
    for (const setup of Object.values(setups)) {
      setup.address = await container.getNewAddress()
      setup.id = await rpcClient.oracle.appointOracle(setup.address, setup.feed, {
        weightage: setup.weightage
      })
      await container.generate(1)
    }

    for (const setup of Object.values(setups)) {
      for (const price of setup.prices) {
        const timestamp = Math.floor(new Date().getTime() / 1000)
        await rpcClient.oracle.setOracleData(setup.id, timestamp, {
          prices: price
        })
        await container.generate(1)
      }
    }

    const height = await container.getBlockCount()
    await container.generate(1)
    await service.waitForIndexedHeight(height)
  })

  it('should list', async () => {
    const prices = await apiClient.prices.list()
    expect(prices.length).toStrictEqual(4)
    expect(prices[0]).toStrictEqual({
      id: 'TB-USD',
      sort: '000000030000006eTB-USD',
      price: {
        block: {
          hash: expect.stringMatching(/[0-f]{64}/),
          height: expect.any(Number),
          medianTime: expect.any(Number),
          time: expect.any(Number)
        },
        currency: 'USD',
        token: 'TB',
        id: 'TB-USD-110',
        key: 'TB-USD',
        sort: expect.any(String),
        aggregated: {
          amount: '2.30000000',
          weightage: 3,
          oracles: {
            active: 2,
            total: 3
          }
        }
      }
    })
  })

  describe('TA-USD', () => {
    it('should get ticker', async () => {
      const ticker = await apiClient.prices.get('TA', 'USD')
      expect(ticker).toStrictEqual({
        id: 'TA-USD',
        sort: '000000030000006eTA-USD',
        price: {
          block: {
            hash: expect.stringMatching(/[0-f]{64}/),
            height: expect.any(Number),
            medianTime: expect.any(Number),
            time: expect.any(Number)
          },
          aggregated: {
            amount: '1.30000000',
            weightage: 3,
            oracles: {
              active: 2,
              total: 3
            }
          },
          currency: 'USD',
          token: 'TA',
          id: 'TA-USD-110',
          key: 'TA-USD',
          sort: expect.any(String)
        }
      })
    })

    it('should get feeds', async () => {
      const feeds = await apiClient.prices.getFeed('TA', 'USD')
      expect(feeds.length).toStrictEqual(6)
    })

    it('should get oracles', async () => {
      const oracles = await apiClient.prices.getOracles('TA', 'USD')
      expect(oracles.length).toStrictEqual(3)

      expect(oracles[0]).toStrictEqual({
        id: expect.stringMatching(/TA-USD-[0-f]{64}/),
        key: 'TA-USD',
        oracleId: expect.stringMatching(/[0-f]{64}/),
        token: 'TA',
        currency: 'USD',
        weightage: expect.any(Number),
        feed: {
          id: expect.any(String),
          key: expect.any(String),
          sort: expect.any(String),
          amount: expect.any(String),
          currency: 'USD',
          token: 'TA',
          time: expect.any(Number),
          oracleId: oracles[0].oracleId,
          txid: expect.stringMatching(/[0-f]{64}/),
          block: {
            hash: expect.stringMatching(/[0-f]{64}/),
            height: expect.any(Number),
            medianTime: expect.any(Number),
            time: expect.any(Number)
          }
        },
        block: {
          hash: expect.stringMatching(/[0-f]{64}/),
          height: expect.any(Number),
          medianTime: expect.any(Number),
          time: expect.any(Number)
        }
      })
    })
  })
})

describe('active price', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)
  const service = new StubService(container)
  const apiClient = new StubWhaleApiClient(service)
  let client: JsonRpcClient

  beforeEach(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()

    client = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterEach(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
  })

  it('should get active price with 2 active oracles (exact values)', async () => {
    const address = await container.getNewAddress()
    const oracles = []
    for (let i = 0; i < 2; i++) {
      oracles.push(await client.oracle.appointOracle(address, [
        { token: 'S1', currency: 'USD' }
      ], {
        weightage: 1
      }))
      await container.generate(1)
    }

    {
      const height = await container.getBlockCount()
      await container.generate(1)
      await service.waitForIndexedHeight(height)
    }

    await testing.generate(1)
    const beforeActivePrice = await apiClient.prices.getFeedActive('S1', 'USD', 1)
    expect(beforeActivePrice.length).toStrictEqual(0)

    for (const oracle of oracles) {
      await client.oracle.setOracleData(oracle, Math.floor(Date.now() / 1000), {
        prices: [
          { tokenAmount: '10.0@S1', currency: 'USD' }
        ]
      })
    }
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'S1',
      fixedIntervalPriceId: 'S1/USD'
    })
    await testing.generate(1)

    const oneMinute = 60
    const timeNow = Math.floor(Date.now() / 1000)
    for (let i = 0; i <= 6; i++) {
      const mockTime = timeNow + i * oneMinute
      await client.misc.setMockTime(mockTime)
      const price = i > 3 ? '12.0' : '10.0'
      for (const oracle of oracles) {
        await client.oracle.setOracleData(oracle, mockTime, {
          prices: [
            { tokenAmount: `${price}@S1`, currency: 'USD' }
          ]
        })
      }
      await testing.generate(1)
    }

    {
      const height = await container.getBlockCount()
      await testing.generate(1)
      await service.waitForIndexedHeight(height)
    }

    const activePrice = await apiClient.prices.getFeedActive('S1', 'USD', 1)
    expect(activePrice[0]).toStrictEqual({
      block: {
        hash: expect.any(String),
        height: expect.any(Number),
        medianTime: expect.any(Number),
        time: expect.any(Number)
      },
      id: expect.any(String),
      key: 'S1-USD',
      active: {
        amount: '10.00000000',
        oracles: {
          active: 2,
          total: 2
        },
        weightage: 2
      },
      next: {
        amount: '12.00000000',
        oracles: {
          active: 2,
          total: 2
        },
        weightage: 2
      },
      sort: expect.any(String),
      isLive: true
    })

    {
      await testing.generate(1)
      const height = await container.getBlockCount()
      await testing.generate(1)
      await service.waitForIndexedHeight(height)
    }

    const nextActivePrice = await apiClient.prices.getFeedActive('S1', 'USD', 1)
    expect(nextActivePrice[0]).toStrictEqual({
      active: {
        amount: '10.00000000',
        oracles: {
          active: 2,
          total: 2
        },
        weightage: 2
      },
      block: {
        hash: expect.any(String),
        height: expect.any(Number),
        medianTime: expect.any(Number),
        time: expect.any(Number)
      },
      id: expect.any(String),
      key: 'S1-USD',
      next: {
        amount: '12.00000000',
        oracles: {
          active: 2,
          total: 2
        },
        weightage: 2
      },
      sort: expect.any(String),
      isLive: true
    })
  })

  it('should get active price with 2 active oracles (vs rpc)', async () => {
    const oracles = []
    for (let i = 0; i < 2; i++) {
      oracles.push(await client.oracle.appointOracle(await container.getNewAddress(), [
        { token: 'S1', currency: 'USD' }
      ], { weightage: 1 }))
      await testing.generate(1)
    }

    for (const oracle of oracles) {
      await client.oracle.setOracleData(oracle, Math.floor(Date.now() / 1000), {
        prices: [
          { tokenAmount: '10.0@S1', currency: 'USD' }
        ]
      })
    }

    await testing.generate(1)
    await testing.rpc.loan.setLoanToken({
      symbol: 'S1',
      fixedIntervalPriceId: 'S1/USD'
    })
    await testing.generate(1)

    const oneMinute = 60
    const timeNow = Math.floor(Date.now() / 1000)
    for (let i = 0; i <= 6; i++) {
      const mockTime = timeNow + i * oneMinute
      await client.misc.setMockTime(mockTime)
      const price = i > 3 ? '12.0' : '10.0'
      for (const oracle of oracles) {
        await client.oracle.setOracleData(oracle, mockTime, {
          prices: [
            { tokenAmount: `${price}@S1`, currency: 'USD' }
          ]
        })
      }
      await container.generate(1)
    }

    // Active price ticks over in this loop, this is to ensure the values align
    for (let i = 0; i <= 5; i++) {
      {
        const height = await container.getBlockCount()
        await container.generate(1)
        await service.waitForIndexedHeight(height)
      }

      const fixedIntervalPrice = await testing.rpc.oracle.getFixedIntervalPrice('S1/USD')
      const activePrice = await apiClient.prices.getFeedActive('S1', 'USD', 1)
      expect(activePrice[0]).toStrictEqual({
        active: {
          amount: fixedIntervalPrice.activePrice.toFixed(8),
          oracles: {
            active: 2,
            total: 2
          },
          weightage: 2
        },
        block: {
          hash: expect.any(String),
          height: fixedIntervalPrice.activePriceBlock,
          medianTime: expect.any(Number),
          time: expect.any(Number)
        },
        id: expect.any(String),
        key: 'S1-USD',
        next: {
          amount: fixedIntervalPrice.nextPrice.toFixed(8),
          oracles: {
            active: 2,
            total: 2
          },
          weightage: 2
        },
        sort: expect.any(String),
        isLive: fixedIntervalPrice.isLive
      })
    }
  })

  it('should go active then inactive then active (vs rpc)', async () => {
    const address = await container.getNewAddress()
    const oracles = []
    for (let i = 0; i < 2; i++) {
      oracles.push(await client.oracle.appointOracle(address, [
        { token: 'S1', currency: 'USD' }
      ], { weightage: 1 }))
      await container.generate(1)
    }

    const beforeActivePrice = await apiClient.prices.getFeedActive('S1', 'USD', 1)
    expect(beforeActivePrice.length).toStrictEqual(0)

    for (const oracle of oracles) {
      await client.oracle.setOracleData(oracle, Math.floor(Date.now() / 1000), {
        prices: [
          { tokenAmount: '10.0@S1', currency: 'USD' }
        ]
      })
    }

    await testing.generate(1)
    await testing.rpc.loan.setLoanToken({
      symbol: 'S1',
      fixedIntervalPriceId: 'S1/USD'
    })
    await testing.generate(1)

    const oneMinute = 60
    const timeNow = Math.floor(Date.now() / 1000)
    for (let i = 0; i <= 6; i++) {
      const mockTime = timeNow + i * oneMinute
      await client.misc.setMockTime(mockTime)
      const price = i > 3 ? '12.0' : '10.0'
      for (const oracle of oracles) {
        await client.oracle.setOracleData(oracle, mockTime, {
          prices: [
            { tokenAmount: `${price}@S1`, currency: 'USD' }
          ]
        })
      }
    }

    {
      const height = await container.getBlockCount()
      await container.generate(1)
      await service.waitForIndexedHeight(height)
      await new Promise((resolve) => setTimeout(resolve, 500))

      const fixedIntervalPrice = await testing.rpc.oracle.getFixedIntervalPrice('S1/USD')
      const activePrice = await apiClient.prices.getFeedActive('S1', 'USD', 1)
      expect(activePrice[0]).toStrictEqual({
        block: {
          hash: expect.any(String),
          height: expect.any(Number),
          medianTime: expect.any(Number),
          time: fixedIntervalPrice.timestamp
        },
        id: expect.any(String),
        key: 'S1-USD',
        next: {
          amount: fixedIntervalPrice.nextPrice.toFixed(8),
          oracles: {
            active: 2,
            total: 2
          },
          weightage: 2
        },
        sort: expect.any(String),
        isLive: fixedIntervalPrice.isLive
      })

      expect(activePrice[0].isLive).toStrictEqual(false)
    }

    // Set mock time in the future
    const mockTime = Math.floor(new Date().getTime() / 1000) + 70 * oneMinute
    await client.misc.setMockTime(mockTime)

    {
      await container.generate(6)
      const height = await container.getBlockCount()
      await container.generate(1)
      await service.waitForIndexedHeight(height)
      await new Promise((resolve) => setTimeout(resolve, 500))

      const fixedIntervalPrice = await testing.rpc.oracle.getFixedIntervalPrice('S1/USD')
      const activePrice = await apiClient.prices.getFeedActive('S1', 'USD', 1)

      expect(activePrice[0]).toStrictEqual({
        active: {
          amount: fixedIntervalPrice.activePrice.toFixed(8),
          oracles: {
            active: 2,
            total: 2
          },
          weightage: 2
        },
        block: {
          hash: expect.any(String),
          height: fixedIntervalPrice.activePriceBlock,
          medianTime: expect.any(Number),
          time: expect.any(Number)
        },
        id: expect.any(String),
        key: 'S1-USD',
        sort: expect.any(String),
        isLive: fixedIntervalPrice.isLive
      })

      expect(activePrice[0].isLive).toStrictEqual(false)
    }

    for (const oracle of oracles) {
      await client.oracle.setOracleData(oracle, mockTime, {
        prices: [
          { tokenAmount: '15.0@S1', currency: 'USD' }
        ]
      })
    }

    {
      await container.generate(6)
      const height = await container.getBlockCount()
      await container.generate(1)
      await service.waitForIndexedHeight(height)
      await new Promise((resolve) => setTimeout(resolve, 500))

      const fixedIntervalPrice = await testing.rpc.oracle.getFixedIntervalPrice('S1/USD')
      const activePrice = await apiClient.prices.getFeedActive('S1', 'USD', 1)

      expect(activePrice[0]).toStrictEqual({
        active: {
          amount: fixedIntervalPrice.activePrice.toFixed(8),
          oracles: {
            active: 2,
            total: 2
          },
          weightage: 2
        },
        next: {
          amount: fixedIntervalPrice.nextPrice.toFixed(8),
          oracles: {
            active: 2,
            total: 2
          },
          weightage: 2
        },
        block: {
          hash: expect.any(String),
          height: fixedIntervalPrice.activePriceBlock,
          medianTime: expect.any(Number),
          time: expect.any(Number)
        },
        id: expect.any(String),
        key: 'S1-USD',
        sort: expect.any(String),
        isLive: fixedIntervalPrice.isLive
      })

      expect(activePrice[0].isLive).toStrictEqual(true)
    }
  })
})
