import { WhaleApiError } from './errors'
import { Method } from './whale.api.client'

export interface WhaleApiResponse<T> {
  data: T
  page?: ApiPage
  error?: WhaleApiError
}

export interface ApiPage {
  /**
   * The next token for the next slice in the greater list.
   */
  next?: string | number
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
 *   let response: ApiPagedResponse = await client.address.listTokens(...)
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
  /**
   * @param {WhaleApiResponse} response that holds the data array and next token
   * @param {Method} method of the REST endpoint
   * @param {string} endpoint to paginate query
   */
  constructor (
    public readonly response: WhaleApiResponse<T[]>,
    public readonly method: Method,
    public readonly endpoint: string) {
    super(...response.data)
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
    return this.response.page?.next
  }
}
