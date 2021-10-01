/**
 * RootConfiguration declares a dictionary for a deeply configurable DeFi ocean setup.
 * `process.env` resolves env variable at service initialization and allows setting of default.
 * This configuration can be injected/replaced at runtime by overriding provider 'ConfigService' or
 * replacing the config module.
 */
export function RootConfiguration (): object {
  return {
    isProd: process.env.NODE_ENV === 'production',
    /**
     * Allows you to override ocean endpoint version.
     */
    version: process.env.OCEAN_VERSION,
    network: process.env.OCEAN_NETWORK,
    defid: {
      url: process.env.OCEAN_DEFID_URL
    }
  }
}
