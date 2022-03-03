import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { StubService } from '../stub.service'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { StubWhaleApiClient } from '../stub.client'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

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

describe('oracles', () => {
  interface OracleSetup {
    id: string
    address: string
    weightage: number
    feed: Array<{ token: string, currency: string }>
    prices: Array<Array<{ tokenAmount: string, currency: string }>>
  }

  const oracles: Record<string, OracleSetup> = {
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
    for (const setup of Object.values(oracles)) {
      setup.address = await container.getNewAddress()
      setup.id = await rpcClient.oracle.appointOracle(setup.address, setup.feed, {
        weightage: setup.weightage
      })
      await container.generate(1)
    }

    for (const setup of Object.values(oracles)) {
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
    const oracles = await apiClient.oracles.list()

    expect(oracles.length).toStrictEqual(3)
    expect(oracles[0]).toStrictEqual({
      id: expect.stringMatching(/[0-f]{64}/),
      ownerAddress: expect.any(String),
      weightage: expect.any(Number),
      priceFeeds: expect.any(Array),
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number),
        medianTime: expect.any(Number),
        time: expect.any(Number)
      }
    })
  })

  it('should get oracle a TA-USD feed', async () => {
    const feed = await apiClient.oracles.getPriceFeed(oracles.a.id, 'TA', 'USD')

    expect(feed.length).toStrictEqual(3)
    expect(feed[0]).toStrictEqual({
      id: expect.any(String),
      key: expect.any(String),
      sort: expect.any(String),
      amount: expect.any(String),
      currency: 'USD',
      token: 'TA',
      time: expect.any(Number),
      oracleId: oracles.a.id,
      txid: expect.stringMatching(/[0-f]{64}/),
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number),
        medianTime: expect.any(Number),
        time: expect.any(Number)
      }
    })
  })

  it('should get oracle a TB-USD feed', async () => {
    const feed = await apiClient.oracles.getPriceFeed(oracles.a.id, 'TB', 'USD')

    expect(feed.length).toStrictEqual(3)
    expect(feed[0]).toStrictEqual({
      id: expect.any(String),
      key: expect.any(String),
      sort: expect.any(String),
      amount: expect.any(String),
      currency: 'USD',
      token: 'TB',
      time: expect.any(Number),
      oracleId: oracles.a.id,
      txid: expect.stringMatching(/[0-f]{64}/),
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number),
        medianTime: expect.any(Number),
        time: expect.any(Number)
      }
    })
  })

  it('should get oracle b TB-USD feed', async () => {
    const feed = await apiClient.oracles.getPriceFeed(oracles.b.id, 'TB', 'USD')

    expect(feed.length).toStrictEqual(2)
    expect(feed[0]).toStrictEqual({
      id: expect.any(String),
      key: expect.any(String),
      sort: expect.any(String),
      amount: '2.5',
      currency: 'USD',
      token: 'TB',
      time: expect.any(Number),
      oracleId: oracles.b.id,
      txid: expect.stringMatching(/[0-f]{64}/),
      block: {
        hash: expect.stringMatching(/[0-f]{64}/),
        height: expect.any(Number),
        medianTime: expect.any(Number),
        time: expect.any(Number)
      }
    })
  })

  it('should get oracles by owner address', async () => {
    const oracles = await apiClient.oracles.list()

    for (const oracle of oracles) {
      const toCompare = await apiClient.oracles.getOracleByAddress(oracle.ownerAddress)
      expect(toCompare).toStrictEqual(oracle)
    }
  })
})
