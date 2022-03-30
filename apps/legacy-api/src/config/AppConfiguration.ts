export function AppConfiguration (): Record<string, any> {
  return {
    BLOCK_CACHE_COUNT_mainnet: process.env.BLOCK_CACHE_COUNT_MAINNET ?? 1_000,
    BLOCK_CACHE_COUNT_testnet: process.env.BLOCK_CACHE_COUNT_TESTNET ?? 1_000
  }
}
