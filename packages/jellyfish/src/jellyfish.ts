import { JsonRpcClient } from '@defichain/jellyfish-jsonrpc'
import { JellyfishClient } from '@defichain/jellyfish-core'

export * from '@defichain/jellyfish-core'

interface Provider {
  url: string
  protocol: string
}

/**
 * @param url to create the HttpProvider
 */
function _HttpProvider (url: string): Provider {
  return {
    url: url,
    protocol: 'JSON-RPC 1.0'
  }
}

/**
 * TODO(fuxingloh): add description after RFC
 */
function _OceanProvider (): Provider {
  return {
    url: 'https://ocean.defichain.com',
    protocol: 'JSON-RPC 1.0'
  }
}

/**
 * Client options for Jellyfish
 */
export interface JellyfishOptions {
  /**
   * Millis before RPC request is aborted
   * @default 60000 ms
   */
  timeout?: number

  /**
   * Headers to include in the RPC request
   */
  headers?: string[][] | Record<string, string>
}

const JellyfishOptionsDefault = {
  timeout: 60000
}

/**
 * Initialize a jellyfish client
 *
 * @param provider for the client
 * - HttpProvider(url: string)
 * - OceanProvider()
 * - url: string = defaults to HttpProvider(url)
 *
 * @param options jellyfish client options
 *
 * @constructor
 */
function _Client (provider: string | Provider = OceanProvider(), options?: JellyfishOptions): JellyfishClient {
  const url = typeof provider === 'string' ? provider : provider.url

  return new JsonRpcClient(url,
    Object.assign(JellyfishOptionsDefault, options ?? {})
  )
}

interface ClientConstructor {
  new (provider?: string | Provider, options?: JellyfishOptions): JellyfishClient

  (provider?: string | Provider, options?: JellyfishOptions): JellyfishClient
}

interface HttpProviderConstructor {
  new (url: string): Provider

  (url: string): Provider
}

interface OceanProviderConstructor {
  new (): Provider

  (): Provider
}

interface Jellyfish {
  Client: ClientConstructor
  HttpProvider: HttpProviderConstructor
  OceanProvider: OceanProviderConstructor
}

export const Client: ClientConstructor = _Client as ClientConstructor
export const HttpProvider: HttpProviderConstructor = _HttpProvider as HttpProviderConstructor
export const OceanProvider: OceanProviderConstructor = _OceanProvider as OceanProviderConstructor

export const _Jellyfish: Jellyfish = {
  Client,
  HttpProvider,
  OceanProvider
}

/**
 * @example <caption>ES6 Modules</caption>
 * import {Client, HttpProvider} from '@defichain/jellyfish'
 * const client = new Client(new HttpProvider('https://ocean.jellyfish.com'), {
 *   timeout: 30000
 * })
 *
 * @example <caption>ES6 Modules default</caption>
 * import jellyfish from '@defichain/jellyfish'
 * const client = jellyfish.Client('https://ocean.jellyfish.com')
 *
 * @example <caption>CommonJS</caption>
 * var jf = require('@defichain/jellyfish')
 * var client1 = jf.Client('https://ocean.jellyfish.com')
 * // or
 * var client2 = new jf.Client(jf.OceanProvider())
 */
export default _Jellyfish
