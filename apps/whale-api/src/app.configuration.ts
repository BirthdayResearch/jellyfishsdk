/**
 * AppConfiguration declares a dictionary for a deeply configurable DeFi whale setup.
 * `process.env` resolves env variable at service initialization and allows setting of default.
 * This configuration can be injected/replaced at runtime by overriding provider 'ConfigService' or
 * replacing the config module.
 */
export const AppConfiguration = (): any => ({
  defid: {
    url: process.env.WHALE_DEFID_URL
  },
  network: process.env.WHALE_NETWORK,
  database: {
    // Provider can only be set via environmental variable
    provider: process.env.WHALE_DATABASE_PROVIDER,
    level: {
      location: process.env.WHALE_DATABASE_LEVEL_LOCATION
    }
  }
})
