import Joi from 'joi'

/**
 * AppConfiguration declares a dictionary for a deeply configurable DeFi whale setup.
 * `process.env` resolves env variable at service initialization and allows setting of default.
 * This configuration can be injected/replaced at runtime by overriding provider 'ConfigService' or
 * replacing the config module.
 */
export function AppConfiguration (): any {
  return {
    isProd: process.env.NODE_ENV === 'production',
    /**
     * Allows you to override whale endpoint version.
     */
    version: process.env.WHALE_VERSION,
    network: process.env.WHALE_NETWORK,
    defid: {
      url: process.env.WHALE_DEFID_URL
    },
    database: {
      // Provider can only be set via environmental variable
      provider: process.env.WHALE_DATABASE_PROVIDER,
      level: {
        location: process.env.WHALE_DATABASE_LEVEL_LOCATION
      }
    }
  }
}

export function ENV_VALIDATION_SCHEMA (): any {
  return Joi.object({
    NODE_ENV: Joi.string().optional(),
    WHALE_VERSION: Joi.string().optional(),
    WHALE_NETWORK: Joi.string().valid('mainnet', 'testnet', 'regtest', 'devnet', 'changi').default('regtest'),
    WHALE_DEFID_URL: Joi.string().optional(),
    WHALE_DATABASE_PROVIDER: Joi.string().optional(),
    WHALE_DATABASE_LEVEL_LOCATION: Joi.string().optional()
  })
}
