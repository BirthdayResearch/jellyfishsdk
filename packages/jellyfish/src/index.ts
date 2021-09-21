import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiClient } from '@defichain/jellyfish-api-core'

import { HttpProvider, HttpProviderConstructor, Provider } from './provider'

/**
 * Client options for Jellyfish
 *
 * @deprecated CJS and UMD bundles has been deprecated, please use individual packages (@defichain/jellyfish-*) for better control of your dependencies.
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

/**
 * @deprecated CJS and UMD bundles has been deprecated, please use individual packages (@defichain/jellyfish-*) for better control of your dependencies.
 */
const JellyfishOptionsDefault = {
  timeout: 60000
}

/**
 * Initialize a jellyfish client
 *
 * @param provider for the client
 * - HttpProvider(url: string)
 * - url: string = defaults to HttpProvider(url)
 *
 * @param options jellyfish client options
 *
 * @constructor
 *
 * @deprecated CJS and UMD bundles has been deprecated, please use individual packages (@defichain/jellyfish-*) for better control of your dependencies.
 */
function initClient (provider: string | Provider, options?: JellyfishOptions): ApiClient {
  const url = typeof provider === 'string' ? provider : provider.url

  return new JsonRpcClient(url,
    Object.assign(JellyfishOptionsDefault, options ?? {})
  )
}

/**
 * @deprecated CJS and UMD bundles has been deprecated, please use individual packages (@defichain/jellyfish-*) for better control of your dependencies.
 */
interface ClientConstructor {
  new (provider: string | Provider, options?: JellyfishOptions): ApiClient

  (provider: string | Provider, options?: JellyfishOptions): ApiClient
}

/**
 * Initialize a Jellyfish Client
 *
 * @deprecated CJS and UMD bundles has been deprecated, please use individual packages (@defichain/jellyfish-*) for better control of your dependencies.
 */
export const Client: ClientConstructor = initClient as ClientConstructor
export {
  HttpProvider
}

/**
 * MIT License
 *
 * Copyright (c) 2021 DeFiChain Foundation
 * Copyright (c) 2021 DeFi Blockchain Contributors
 * Copyright (c) 2021 DeFi Jellyfish Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.

 * @example <caption>ES6 Modules</caption>
 * import {Client, HttpProvider} from '@defichain/jellyfish'
 * // You can find this in your defi.config file
 * const client = new Client(new HttpProvider(`http://${user}:${password}@127.0.0.1:${port}/`), {
 *   timeout: 30000
 * })
 *
 * @example <caption>ES6 Modules default</caption>
 * import jellyfish from '@defichain/jellyfish'
 * const client = jellyfish.Client(`http://${user}:${password}@127.0.0.1:${port}/`)
 *
 * @example <caption>CommonJS</caption>
 * var jf = require('@defichain/jellyfish')
 * var client1 = jf.Client(`http://${user}:${password}@127.0.0.1:${port}/`)
 *
 * @deprecated CJS and UMD bundles has been deprecated, please use individual packages (@defichain/jellyfish-*) for better control of your dependencies.
 */
export const Jellyfish: {
  Client: ClientConstructor
  HttpProvider: HttpProviderConstructor
} = {
  Client,
  HttpProvider
}

/* eslint-disable import/no-default-export */
/**
 * @deprecated CJS and UMD bundles has been deprecated, please use individual packages (@defichain/jellyfish-*) for better control of your dependencies.
 */
export default Jellyfish
