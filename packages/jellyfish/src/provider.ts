export interface Provider {
  url: string
  protocol: string
}

export interface HttpProviderConstructor {
  new (url: string): Provider

  (url: string): Provider
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
 * Initialize a HttpProvider for Jellyfish Client
 */
export const HttpProvider: HttpProviderConstructor = initHttpProvider as HttpProviderConstructor
