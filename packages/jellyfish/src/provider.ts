export interface Provider {
  url: string
  protocol: string
}

export interface HttpProviderConstructor {
  new (url: string): Provider

  (url: string): Provider
}

export interface OceanProviderConstructor {
  new (): Provider

  (): Provider
}

/**
 * @param url to create the HttpProvider
 */
function initHttpProvider (url: string): Provider {
  return {
    url: url,
    protocol: 'JSON-RPC 1.0'
  }
}

/**
 * @see https://github.com/DeFiCh/ocean
 */
function initOceanProvider (): Provider {
  return {
    url: 'https://ocean.defichain.com',
    protocol: 'JSON-RPC 1.0'
  }
}

/**
 * Initialize a HttpProvider for Jellyfish Client
 */
export const HttpProvider: HttpProviderConstructor = initHttpProvider as HttpProviderConstructor
/**
 * Initialize a OceanProvider for Jellyfish Client
 * @see https://github.com/DeFiCh/ocean
 */
export const OceanProvider: OceanProviderConstructor = initOceanProvider as OceanProviderConstructor
