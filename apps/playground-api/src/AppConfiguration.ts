/**
 * AppConfiguration declares a dictionary for a deeply configurable DeFi playground setup.
 * `process.env` resolves env variable at service initialization and allows setting of default.
 * This configuration can be injected/replaced at runtime by overriding provider 'ConfigService' or
 * replacing the config module.
 */
// eslint-disable-next-line
export const AppConfiguration = (): any => ({
  BLOCKCHAIN_CPP_URL: process.env.PLAYGROUND_DEFID_URL,
  // Playground alive till max block count
  PLAYGROUND_MAX_BLOCK_COUNT: 20 * 60 * 24 // 1 day with - 1 block per 3 seconds
})
