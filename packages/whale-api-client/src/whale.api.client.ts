import AbortController from 'abort-controller'
import fetch from 'cross-fetch'
import { URLSearchParams } from 'url'
import { raiseIfError, WhaleClientException, WhaleClientTimeoutException } from './errors'
import { WhaleApiResponse, ApiPagedResponse } from './whale.api.response'
import { Address } from './api/address'
import { PoolPair } from './api/poolpair'
import { Rpc } from './api/rpc'
import { Transactions } from './api/transactions'

/**
 * WhaleApiClient Options
 */
export interface WhaleApiClientOptions {
  url: string

  /**
   * Millis before request is aborted.
   * @default 60000 ms
   */
  timeout?: number

  /**
   * Version of API
   */
  version?: 'v1'

  /**
   * Network that whale client is configured to
   */
  network?: 'mainnet' | 'testnet' | 'regtest'
}

/**
 * WhaleApiClient default options
 */
export const DefaultOptions: WhaleApiClientOptions = {
  url: 'https://whale.ocean.defichain.com',
  timeout: 60000,
  version: 'v1',
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

export class WhaleApiClient {
  public readonly address = new Address(this)
  public readonly poolpair = new PoolPair(this)
  public readonly rpc = new Rpc(this)
  public readonly transactions = new Transactions(this)

  constructor (
    private readonly options: WhaleApiClientOptions
  ) {
    this.options = Object.assign(DefaultOptions, options ?? {})
    this.options.url = this.options.url.replace(/\/$/, '')
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
   * @return {ApiPagedResponse} data list in the JSON response body for pagination query
   * @see {paginate(ApiPagedResponse)} for pagination query chaining
   */
  async requestList<T> (method: Method, path: string, size: number, next?: string): Promise<ApiPagedResponse<T>> {
    const params = new URLSearchParams()
    params.set('size', size.toString())

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
    const url = `${urlString}/${version as string}/${network as string}/${path}`

    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await _fetch(method, url, controller, body)
      clearTimeout(id)
      return response
    } catch (err) {
      if (err.type === 'aborted') {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        throw new WhaleClientTimeoutException(timeout!)
      }

      throw err
    }
  }
}

async function _fetch (method: Method, url: string, controller: AbortController, body?: string): Promise<ResponseAsString> {
  const response = await fetch(url, {
    method: method,
    headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
    body: body,
    cache: 'no-cache',
    signal: controller.signal
  })

  return {
    status: response.status,
    body: await response.text()
  }
}
