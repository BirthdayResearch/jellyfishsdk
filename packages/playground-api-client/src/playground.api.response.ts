import { PlaygroundApiError } from './errors'
import { Method } from './playground.api.client'

export interface PlaygroundApiResponse<T> {
  data: T
  page?: ApiPage
  error?: PlaygroundApiError
}

export interface ApiPage {
  /**
   * The next token for the next slice in the greater list.
   * For simplicity, next token must a string or be encoded as a string.
   * If the next token is in other formats such as bytes or number,
   * it must be parsed by the controller.
   */
  next?: string
}

/**
 * ApiPagedResponse class facilitate the ability to pagination query chaining.
 * It extends the Array class and can be accessed like an array, `res[0]`, `res.length`.
 *
 * After accessing all the items in the Array, you can use the same ApiPagedResponse
 * to query the next set of items. Hence allowing you query pagination chaining until you
 * exhaustive all items in the list.
 *
 * @example
 *   let response: ApiPagedResponse = await client.address.listToken(...)
 *   for (const item of response) {
 *     console.log(item)
 *   }
 *
 *   // To query next set of items:
 *   let response = await client.pagination(response)
 *   for (const item of response) {
 *     console.log(item)
 *   }
 */
export class ApiPagedResponse<T> extends Array<T> {
  private readonly _paginate: {
    page?: ApiPage
    method: Method
    endpoint: string
  }

  /**
   * @param {PlaygroundApiResponse} response that holds the data array and next token
   * @param {Method} method of the REST endpoint
   * @param {string} endpoint to paginate query
   */
  constructor (response: PlaygroundApiResponse<T[]>, method: Method, endpoint: string) {
    super(...response.data)
    this._paginate = {
      page: response.page,
      method: method,
      endpoint: endpoint
    }
  }

  /**
   * @return {string} endpoint to paginate query
   */
  get endpoint (): string {
    return this._paginate.endpoint
  }

  /**
   * @return {Method} method of the REST endpoint
   */
  get method (): Method {
    return this._paginate.method
  }

  /**
   * @return {boolean} whether there a next set of items to paginate
   */
  get hasNext (): boolean {
    return this.nextToken !== undefined
  }

  /**
   * @return {string} next token
   */
  get nextToken (): string | number | undefined {
    return this._paginate.page?.next
  }
}
