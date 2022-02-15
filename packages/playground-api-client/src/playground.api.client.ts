import AbortController from 'abort-controller'
import fetch from 'cross-fetch'
import { raiseIfError, PlaygroundClientException, PlaygroundClientTimeoutException } from './errors'
import { PlaygroundApiResponse, ApiPagedResponse } from './playground.api.response'
import { Rpc } from './api/rpc'
import { Playground } from './api/playground'
import { Wallet } from './api/wallet'

/**
 * PlaygroundApiClient Options
 */
export interface PlaygroundApiClientOptions {
  url: string

  /**
   * Millis before request is aborted.
   * @default 60000 ms
   */
  timeout?: number

  /**
   * Version of API
   */
  version?: 'v0'
}

/**
 * PlaygroundApiClient default options
 */
export const DefaultOptions: PlaygroundApiClientOptions = {
  url: 'https://ocean.defichain.com',
  timeout: 60000,
  version: 'v0'
}

/**
 * Supported REST Method for DeFi Playground
 */
export type Method = 'POST' | 'GET'

export interface ResponseAsString {
  status: number
  body: string
}

export class PlaygroundApiClient {
  public readonly rpc = new Rpc(this)
  public readonly playground = new Playground(this)
  public readonly wallet = new Wallet(this)

  constructor (
    private readonly options: PlaygroundApiClientOptions
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
      throw new PlaygroundClientException('endpoint does not contain query params for pagination')
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
   * @return {PlaygroundApiResponse} parsed structured JSON response
   */
  async requestAsApiResponse<T> (method: Method, path: string, object?: any): Promise<PlaygroundApiResponse<T>> {
    const json = object !== undefined ? JSON.stringify(object) : undefined
    const raw = await this.requestAsString(method, path, json)
    const response: PlaygroundApiResponse<T> = JSON.parse(raw.body)
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
    const { url: urlString, version, timeout } = this.options
    const url = `${urlString}/${version as string}/playground/${path}`

    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await _fetch(method, url, controller, body)
      clearTimeout(id)
      return response
    } catch (err) {
      if (err.type === 'aborted') {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        throw new PlaygroundClientTimeoutException(timeout!)
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
