import 'url-search-params-polyfill'
import AbortController from 'abort-controller'
import fetch from 'cross-fetch'
import { Address } from './api/address'
import { PoolPairs } from './api/poolpairs'
import { Rpc } from './api/rpc'
import { Transactions } from './api/transactions'
import { Tokens } from './api/tokens'
import { Masternodes } from './api/masternodes'
import { Blocks } from './api/blocks'
import { Oracles } from './api/oracles'
import { Prices } from './api/prices'
import { Stats } from './api/stats'
import { Rawtx } from './api/rawtx'
import { Fee } from './api/fee'
import { Loan } from './api/loan'
import { Consortium } from './api/consortium'
import { ApiPagedResponse, WhaleApiResponse } from './whale.api.response'
import { raiseIfError, WhaleApiException, WhaleClientException, WhaleClientTimeoutException } from './errors'
import { NetworkName } from '@defichain/jellyfish-network'
import { Governance } from './api/governance'

/**
 * WhaleApiClient Options
 */
export interface WhaleApiClientOptions {
  url?: string

  /**
   * Millis before request is aborted.
   * @default 60000 ms
   */
  timeout?: number

  /**
   * Version of API
   * `v{major}.{minor}` or `v{major}`
   */
  version?: string

  /**
   * Network that whale client is configured to
   */
  network?: NetworkName
}

/**
 * WhaleApiClient default options
 */
const DEFAULT_OPTIONS: WhaleApiClientOptions = {
  url: 'https://ocean.defichain.com',
  timeout: 60000,
  version: 'v0',
  network: 'mainnet'
}

/**
 * Supported REST Method for DeFi Whale
 */
export type Method = 'POST' | 'GET'

export interface ResponseAsString {
  status: number
  body: string
}

export interface QueryParameter {
  [key: string]: string | number | boolean
}

export class WhaleApiClient {
  public readonly rpc = new Rpc(this)
  public readonly address = new Address(this)
  public readonly poolpairs = new PoolPairs(this)
  public readonly transactions = new Transactions(this)
  public readonly tokens = new Tokens(this)
  public readonly masternodes = new Masternodes(this)
  public readonly blocks = new Blocks(this)
  public readonly oracles = new Oracles(this)
  public readonly prices = new Prices(this)
  public readonly stats = new Stats(this)
  public readonly rawtx = new Rawtx(this)
  public readonly fee = new Fee(this)
  public readonly loan = new Loan(this)
  public readonly consortium = new Consortium(this)
  public readonly governance = new Governance(this)

  constructor (
    protected readonly options: WhaleApiClientOptions
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.options.url = this.options.url?.replace(/\/$/, '')
  }

  /**
   * @param {ApiPagedResponse} response from the previous request for pagination chaining
   */
  async paginate<T> (response: ApiPagedResponse<T>): Promise<ApiPagedResponse<T>> {
    const token = response.nextToken
    if (token === undefined) {
      return new ApiPagedResponse({ data: [] }, response.method, response.endpoint)
    }

    const [path, query] = response.endpoint.split('?')
    if (query === undefined) {
      throw new WhaleClientException('endpoint does not contain query params for pagination')
    }

    const params = new URLSearchParams(query)
    params.set('next', token.toString())
    const endpoint = `${path}?${params.toString()}`

    const apiResponse = await this.requestAsApiResponse<T[]>(response.method, endpoint)
    return new ApiPagedResponse<T>(apiResponse, response.method, endpoint)
  }

  /**
   * @param {'POST|'GET'} method to request
   * @param {string} path to request
   * @param {number} [size] of the list
   * @param {string} [next] token for pagination
   * @param {QueryParameter} [queryParam] optional query parameter
   * @return {ApiPagedResponse} data list in the JSON response body for pagination query
   * @see {paginate(ApiPagedResponse)} for pagination query chaining
   */
  async requestList<T> (method: Method, path: string, size: number, next?: string, queryParam?: QueryParameter): Promise<ApiPagedResponse<T>> {
    const params = new URLSearchParams()
    params.set('size', size.toString())

    if (queryParam !== undefined) {
      for (const query in queryParam) {
        params.set(query, queryParam[query].toString())
      }
    }

    if (next !== undefined) {
      params.set('next', next)
    }

    const endpoint = `${path}?${params.toString()}`
    const response = await this.requestAsApiResponse<T[]>(method, endpoint)
    return new ApiPagedResponse<T>(response, method, endpoint)
  }

  /**
   * @param {'POST|'GET'} method to request
   * @param {string} path to request
   * @param {any} [object] JSON to send in request
   * @return {T} data object in the JSON response body
   */
  async requestData<T> (method: Method, path: string, object?: any): Promise<T> {
    const response = await this.requestAsApiResponse<T>(method, path, object)
    return response.data
  }

  /**
   * @param {'POST|'GET'} method to request
   * @param {string} path to request
   * @param {object} [object] JSON to send in request
   * @return {WhaleApiResponse} parsed structured JSON response
   */
  async requestAsApiResponse<T> (method: Method, path: string, object?: any): Promise<WhaleApiResponse<T>> {
    const json = object !== undefined ? JSON.stringify(object) : undefined
    const raw = await this.requestAsString(method, path, json)
    const response: WhaleApiResponse<T> = JSON.parse(raw.body)
    raiseIfError(response)
    return response
  }

  /**
   * @param {'POST|'GET'} method to request
   * @param {string} path to request
   * @param {object} [body] in string in request
   * @return {ResponseAsString} as JSON string (RawResponse)
   */
  async requestAsString (method: Method, path: string, body?: string): Promise<ResponseAsString> {
    const { url: urlString, version, network, timeout } = this.options
    const url = `${urlString as string}/${version as string}/${network as string}/${path}`

    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await _fetch(method, url, controller, body)
      clearTimeout(id)
      return response
    } catch (err) {
      if ((err as WhaleApiException).type === 'aborted') {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        throw new WhaleClientTimeoutException(timeout!)
      }

      throw err
    }
  }
}

/**
 * Generic method for making http requests
 *
 * @param {Method} method for the endpoint
 * @param {string} url to fetch
 * @param {AbortController} controller for aborting request
 * @param {string} body of the request
 * @returns {Promise<ResponseAsString>}
 */
async function _fetch (method: Method, url: string, controller: AbortController, body?: string): Promise<ResponseAsString> {
  const response = await fetch(url, {
    method: method,
    headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
    body: body,
    cache: 'no-cache',
    // eslint-disable-next-line
    // @ts-ignore
    signal: controller.signal
  })

  return {
    status: response.status,
    body: await response.text()
  }
}
