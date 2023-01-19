import 'url-search-params-polyfill'
import AbortController from 'abort-controller'
import fetch from 'cross-fetch'
import { ApiException, ApiMethod, ApiPagedResponse, ApiResponse, ClientException, TimeoutException } from './'

/**
 * OceanApiClient configurable options
 */
export interface OceanApiClientOptions {
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
   * Network that ocean client is configured to
   */
  network?: 'mainnet' | 'testnet' | 'regtest' | string
}

/**
 * OceanApiClient
 */
export class OceanApiClient {
  constructor (
    protected readonly options: OceanApiClientOptions
  ) {
    this.options = {
      url: 'https://ocean.defichain.com',
      timeout: 60000,
      version: 'v1',
      network: 'mainnet',
      ...options
    }
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
      throw new ClientException('endpoint does not contain query params for pagination')
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
  async requestList<T> (method: ApiMethod, path: string, size: number, next?: string): Promise<ApiPagedResponse<T>> {
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
   * @return data object in the JSON response body
   */
  async requestData<T> (method: ApiMethod, path: string, object?: any): Promise<T> {
    const response = await this.requestAsApiResponse<T>(method, path, object)
    return response.data
  }

  /**
   * @param {'POST|'GET'} method to request
   * @param {string} path to request
   * @param {object} [object] JSON to send in request
   * @return {ApiResponse} parsed structured JSON response
   */
  async requestAsApiResponse<T> (method: ApiMethod, path: string, object?: any): Promise<ApiResponse<T>> {
    const json = object !== undefined ? JSON.stringify(object) : undefined
    const raw = await this.requestAsString(method, path, json)
    const response: ApiResponse<T> = JSON.parse(raw.body)
    ApiException.raiseIfError(response)
    return response
  }

  /**
   * @param {'POST|'GET'} method to request
   * @param {string} path to request
   * @param {object} [body] in string in request
   * @return {ResponseAsString} as JSON string (RawResponse)
   */
  async requestAsString (method: ApiMethod, path: string, body?: string): Promise<ResponseAsString> {
    const {
      url: urlString,
      version,
      network,
      timeout
    } = this.options
    const url = `${urlString as string}/${version as string}/${network as string}/${path}`

    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await _fetch(method, url, controller, body)
      clearTimeout(id)
      return response
    } catch (err: any) {
      if (err.type === 'aborted') {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        throw new TimeoutException(timeout!)
      }

      throw err
    }
  }
}

export interface ResponseAsString {
  status: number
  body: string
}

async function _fetch (method: ApiMethod, url: string, controller: AbortController, body?: string): Promise<ResponseAsString> {
  const response = await fetch(url, {
    method: method,
    headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
    body: body,
    cache: 'no-cache',
    signal: controller.signal as any
  })

  return {
    status: response.status,
    body: await response.text()
  }
}
