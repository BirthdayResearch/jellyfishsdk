import { LegacyApiTesting } from '../../testing/LegacyApiTesting'
import { DexSwapQueue, LegacySubgraphSwap } from '../../src/providers/index/DexSwapQueue'
import { SupportedNetwork } from '../../src/pipes/NetworkValidationPipe'

const apiTesting = LegacyApiTesting.create({
  mainnetBlockCacheCount: 100,
  testnetBlockCacheCount: 10
})
let dexSwapQueueMainnet: DexSwapQueue
let dexSwapQueueTestnet: DexSwapQueue

beforeAll(async () => {
  await apiTesting.start()

  dexSwapQueueMainnet = apiTesting.app.get('DexSwapQueue-mainnet')
  dexSwapQueueTestnet = apiTesting.app.get('DexSwapQueue-testnet')
})

afterAll(async () => {
  await apiTesting.stop()
})

it('should index dex swaps', async () => {
  await apiTesting.waitForSyncToTip('mainnet')
  await apiTesting.waitForSyncToTip('testnet')

  const mainnetSwaps = dexSwapQueueMainnet.getAll()
  verifySwapsShape(mainnetSwaps)
  verifySwapsOrdering(mainnetSwaps, 'mainnet')

  const testnetSwaps = dexSwapQueueTestnet.getAll()
  verifySwapsShape(testnetSwaps)
  verifySwapsOrdering(testnetSwaps, 'testnet')

  console.log('Test passed on swaps:', {
    mainnet: mainnetSwaps.length,
    testnet: testnetSwaps.length
  })
})

export function verifySwapsShape (swaps: LegacySubgraphSwap[]): void {
  const ONLY_DECIMAL_NUMBER_REGEX = /^[0-9]+(\.[0-9]+)?$/
  for (const swap of swaps) {
    expect(swap).toStrictEqual({
      block: {
        hash: expect.any(String),
        height: expect.any(Number)
      },
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
  swaps: LegacySubgraphSwap[],
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
