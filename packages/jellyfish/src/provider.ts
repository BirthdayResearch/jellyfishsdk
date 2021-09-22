/**
 * @deprecated CJS and UMD bundles has been deprecated, please use individual packages (@defichain/jellyfish-*) for better control of your dependencies.
 */
export interface Provider {
  url: string
  protocol: string
}

/**
 * @deprecated CJS and UMD bundles has been deprecated, please use individual packages (@defichain/jellyfish-*) for better control of your dependencies.
 */
export interface HttpProviderConstructor {
  new (url: string): Provider

  (url: string): Provider
}

/**
 * @param url to create the HttpProvider
 * @deprecated CJS and UMD bundles has been deprecated, please use individual packages (@defichain/jellyfish-*) for better control of your dependencies.
 */
function initHttpProvider (url: string): Provider {
  return {
    url: url,
    protocol: 'JSON-RPC 1.0'
  }
}

/**
 * Initialize a HttpProvider for Jellyfish Client
 *
 * @deprecated CJS and UMD bundles has been deprecated, please use individual packages (@defichain/jellyfish-*) for better control of your dependencies.
 */
export const HttpProvider: HttpProviderConstructor = initHttpProvider as HttpProviderConstructor
