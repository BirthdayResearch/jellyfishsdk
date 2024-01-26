import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { LegacyController } from '../legacy.controller'
import { createTestingApp, stopTestingApp, waitForIndexedHeightLatest } from '../../e2e.module'
import { Testing } from '@defichain/jellyfish-testing'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import {
  addPoolLiquidity,
  createPoolPair,
  createToken,
  mintTokens,
  poolSwap,
  sendTokensToAddress
} from '@defichain/testing'
import {
  encodeBase64
} from '../../../../legacy-api/src/controllers/PoolPairController'

const ONLY_DECIMAL_NUMBER_REGEX = /^[0-9]+(\.[0-9]+)?$/

const container = new MasterNodeRegTestContainer()
let controller: LegacyController
let testing: Testing
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(container)
  testing = Testing.create(container)
  controller = app.get(LegacyController)

  const ownerAddress = await testing.container.getNewAddress()
  const tokens = ['A']

  for (const token of tokens) {
    await container.waitForWalletBalanceGTE(110)
    await createToken(container, token)
    await mintTokens(container, token)
  }
  await createPoolPair(container, 'A', 'DFI')
  await addPoolLiquidity(container, {
    tokenA: 'A',
    amountA: 500,
    tokenB: 'DFI',
    amountB: 500,
    shareAddress: ownerAddress
  })

  await sendTokensToAddress(container, ownerAddress, 1000, 'A')

  // Execute 100 pool swaps of A to DFI
  for (let i = 1; i <= 100; i++) {
    await poolSwap(container, {
      from: ownerAddress,
      tokenFrom: 'A',
      amountFrom: 1,
      to: ownerAddress,
      tokenTo: 'DFI'
    })
    // for test performance - generate a block only every 10 transactions
    if (i % 10 === 0) {
      await container.generate(1)
    }
  }

  // Execute 50 pool swaps of DFI to A
  for (let i = 1; i <= 50; i++) {
    await poolSwap(container, {
      from: ownerAddress,
      tokenFrom: 'DFI',
      amountFrom: 1,
      to: ownerAddress,
      tokenTo: 'A'
    })
    // for test performance - generate a block only every 10 transactions
    if (i % 10 === 0) {
      await container.generate(1)
    }
  }

  await waitForIndexedHeightLatest(app, container)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('getsubgraphswaps', () => {
  it('/getsubgraphswaps - default 20', async () => {
    const response = await controller.getSubgraphSwaps()
    expect(response.data.swaps.length).toStrictEqual(20)
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

  it('/getsubgraphswaps?limit=3', async () => {
    const response = await controller.getSubgraphSwaps(3)
    expect(response.data.swaps.length).toStrictEqual(3)
  })

  it('/getsubgraphswaps?limit=-1', async () => {
    const response = await controller.getSubgraphSwaps(-1)
    expect(response.data.swaps.length).toStrictEqual(0)
  })

  it('/getsubgraphswaps?limit=101 - limited to 20', async () => {
    const response = await controller.getSubgraphSwaps(101)
    expect(response.data.swaps.length).toStrictEqual(20)
  })

  describe('pagination', () => {
    it('/getsubgraphswaps?limit=X&next=Y - should paginate correctly', async () => {
      // TODO(eli-lim): verify pagination logic -> order should start at txn limit, then -= 1
      //    because the search starts from chain tip and progresses downwards
      const swap1To3 = await controller.getSubgraphSwaps(3, encodeBase64({ height: '169', order: '0' }))
      expect(toJson(swap1To3)).toStrictEqual({
        data: {
          swaps: [
            {
              from: { amount: '1.00000000', symbol: 'A' },
              to: { amount: '0.81016268', symbol: 'DFI' },
              id: expect.any(String),
              timestamp: expect.any(String)
            },
            {
              from: { amount: '1.00000000', symbol: 'A' },
              to: { amount: '0.81308745', symbol: 'DFI' },
              id: expect.any(String),
              timestamp: expect.any(String)
            },
            {
              from: { amount: '1.00000000', symbol: 'A' },
              to: { amount: '0.81602809', symbol: 'DFI' },
              id: expect.any(String),
              timestamp: expect.any(String)
            }
          ]
        },
        page: {
          next: encodeBase64({ height: '166', order: '0' }) // eyJoZWlnaHQiOiIxNjciLCJvcmRlciI6IjAifQ
        }
      })

      expect(toJson(await controller.getSubgraphSwaps(1, encodeBase64({ height: '169', order: '0' }))))
        .toStrictEqual({
          data: { swaps: [swap1To3.data.swaps[0]] },
          page: { next: encodeBase64({ height: '168', order: '0' }) }
        })

      expect(toJson(await controller.getSubgraphSwaps(1, encodeBase64({ height: '168', order: '0' }))))
        .toStrictEqual({
          data: { swaps: [swap1To3.data.swaps[1]] },
          page: { next: encodeBase64({ height: '167', order: '0' }) }
        })

      expect(toJson(await controller.getSubgraphSwaps(1, encodeBase64({ height: '167', order: '0' }))))
        .toStrictEqual({
          data: { swaps: [swap1To3.data.swaps[2]] },
          page: { next: encodeBase64({ height: '166', order: '0' }) }
        })
    })
  })
})

// Skipped as caching has been removed
describe.skip('getsubgraphswaps - rely on caching', () => {
  it('/getsubgraphswaps - should return 100 relatively quickly', async () => {
    // When getsubgraphswaps query is made
    const msStart = Date.now()
    const response = await controller.getSubgraphSwaps(100)
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

    expect(response.data.swaps.length).toStrictEqual(100)

    // And all swaps have correct shape
    verifySwapsShape(response.data.swaps)

    // And swaps are ordered by timestamp
    verifySwapsOrdering(response.data.swaps, 'desc')
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
  order: 'asc' | 'desc' = 'asc'
): void {
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

function toJson (object: any): any {
  return JSON.parse(JSON.stringify(object))
}
