import { WhaleApiError } from './errors'
import { Method } from './whale.api.client'

export interface ApiResponse<T> {
  data: T
  page?: ApiResponsePage
  error?: WhaleApiError
}

export interface ApiResponsePage {
  /**
   * The next token for the next slice in the greater list.
   */
  next?: string
}

/**
 * ApiResponsePagination class facilitate the ability to pagination query chaining.
 * It extends the Array class and can be accessed like an array, `res[0]`, `res.length`.
 *
 * After accessing all the items in the Array, you can use the same ApiResponsePagination
 * to query the next set of items. Hence allowing you query pagination chaining until you
 * exhaustive all items in the list.
 *
 * @example
 *   let response: ApiResponsePagination = await client.address.listTokens(...)
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
export class ApiResponsePagination<T> extends Array<T> {
  /**
   * @param {ApiResponse} response that holds the data array and next token
   * @param {Method} method of the REST endpoint
   * @param {string} endpoint to paginate query
   */
  constructor (
    public readonly response: ApiResponse<T[]>,
    public readonly method: Method,
    public readonly endpoint: string) {
    super(response.data.length)
    this.push(...response.data)
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
  get nextToken (): string | undefined {
    return this.response.page?.next
  }
}
