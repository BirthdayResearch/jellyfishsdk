import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '../../src'
import { StubWhaleApiClient } from '../stub.client'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { PriceFeedTimeInterval } from '@whale-api-client/api/prices'

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

describe('pricefeed with interval', () => {
  let container: MasterNodeRegTestContainer
  let service: StubService
  let client: JsonRpcClient
  let apiClient: WhaleApiClient

  beforeAll(async () => {
    container = new MasterNodeRegTestContainer()
    service = new StubService(container)
    apiClient = new StubWhaleApiClient(service)

    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await service.start()

    client = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterAll(async () => {
    try {
      await service.stop()
    } finally {
      await container.stop()
    }
  })

  it('should get interval', async () => {
    const address = await container.getNewAddress()
    const oracleId = await client.oracle.appointOracle(address, [
      { token: 'S1', currency: 'USD' }
    ], {
      weightage: 1
    })
    await container.generate(1)

    const oneMinute = 60
    const timeNow = Math.floor(new Date().getTime() / 1000)
    for (let i = 0; i < 60; i++) {
      const mockTime = timeNow + i * oneMinute
      const price = (i + 1).toFixed(2)
      await client.oracle.setOracleData(oracleId, timeNow + 5 * 60 - 1, {
        prices: [
          { tokenAmount: `${price}@S1`, currency: 'USD' }
        ]
      })
      await client.call('setmocktime', [mockTime], 'number')
      await container.generate(1)
    }

    const height = await container.getBlockCount()
    await container.generate(1)
    await service.waitForIndexedHeight(height)

    const noInterval = await apiClient.prices.getFeed('S1', 'USD', 60)
    expect(noInterval.length).toStrictEqual(60)

    const interval5Minutes = await apiClient.prices.getFeedWithInterval('S1', 'USD', PriceFeedTimeInterval.FIVE_MINUTES, 60)
    expect(interval5Minutes.length).toStrictEqual(10)
    expect(interval5Minutes.map(x => x.aggregated.amount)).toStrictEqual(
      [
        '60.00000000',
        '56.50000000',
        '50.50000000',
        '44.50000000',
        '38.50000000',
        '32.50000000',
        '26.50000000',
        '20.50000000',
        '14.50000000',
        '6.00000000'
      ]
    )

    const interval10Minutes = await apiClient.prices.getFeedWithInterval('S1', 'USD', PriceFeedTimeInterval.TEN_MINUTES, 60)
    expect(interval10Minutes.length).toStrictEqual(5)
    expect(interval10Minutes.map(x => x.aggregated.amount)).toStrictEqual(
      [
        '55.00000000',
        '44.00000000',
        '33.00000000',
        '22.00000000',
        '8.50000000'
      ]
    )
  })
})
