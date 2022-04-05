import { ApiRawResponse } from './api.response'

/**
 * ApiPage for pagination ApiPagedResponse pagination
 * - `next` token indicate the token used to get the next slice window.
 */
export interface ApiPage {
  next?: string
}

/**
 * ApiPagedResponse, implements ApiResponse interface from response.interceptor.
 *
 * ApiPagedResponse indicates that this response of data array slice is part of a sorted list of items.
 * Items are part of a larger sorted list and the slice indicates a window within the large sorted list.
 * Each ApiPagedResponse holds the data array and the "token" for the next part of the slice.
 * The next token should be passed via @Query('next') and only used when getting the next slice.
 * Hence the first request, the next token is always empty and not provided.
 *
 * With ascending sorted list and a limit of 3 items per slice will have the behaviour as such.
 *
 * SORTED  : | [1] [2] [3] | [4] [5] [6] | [7] [8] [9] | [10]
 * Query 1 : Data: [1] [2] [3], Next: 3, Operator: GT (>)
 * Query 2 : Data: [4] [5] [6], Next: 6, Operator: GT (>)
 * Query 3 : Data: [7] [8] [9], Next: 9, Operator: GT (>)
 * Query 4 : Data: [10], Next: undefined
 *
 * This design is resilient also mutating sorted list, where pagination is not.
 *
 * SORTED  : [2] [4] [6] [8] [10] [12] [14]
 * Query 1 : Data: [2] [4] [6], Next: 6, Operator: GT (>)
 *
 * Being in a slice window, the larger sorted list can be mutated.
 * You only need the next token to get the next slice.
 * MUTATED : [2] [4] [7] [8] [9] [10] [12] [14]
 * Query 2 : Data: [7] [8] [9], Next: 6, Operator: GT (>)
 *
 * Limitations of this requires your data structure to always be sorted in one direction and your sort
 * indexes always fixed. Hence the moving down of that slice window, your operator will be greater than (GT).
 * While moving up your operator will be less than (GT).
 *
 * ASC  : | [1] [2] [3] | [4] [5] [6] | [7] [8] [9] |
 *                      >3            >6             >9
 * DESC : | [9] [8] [7] | [6] [5] [4] | [3] [2] [1] |
 *                      <7            <4            <1
 *
 * For developer quality life it's unwise to allow inclusive operator, it just creates more overhead
 * to understanding our services. No GTE or LTE, always GT and LE. Services must be clean and clear,
 * when the usage narrative is clear and so will the use of ease. LIST query must be dead simple.
 * Imagine travelling down the path, and getting a "next token" to get the next set of items to
 * continue walking.
 *
 * Because the limit is not part of the slice window your query mechanism should support varying size windows.
 *
 * DATA: | [1] [2] [3] | [4] [5] [6] [7] | [8] [9] | ...
 *       | limit 3, >3 | limit 4, >7     | limit 2, >9
 *
 * For simplicity your API should not attempt to allow access to different sort indexes, be cognizant of
 * how our APIs are consumed. If we create a GET /blocks operation to list blocks what would the correct indexes
 * be 99% of the time?
 *
 * Answer: Blocks sorted by height in descending order, that's your sorted list and your slice window.
 *       : <- Latest | [100] [99] [98] [97] [...] | Oldest ->
 */
export class ApiPagedResponse<T> extends ApiRawResponse {
  data: T[]
  page?: ApiPage

  protected constructor (data: T[], next?: string) {
    super()
    this.data = data
    this.page = next !== undefined ? { next } : undefined
  }

  /**
   * @param {T[]} data array slice
   * @param {string} next token slice for greater than, less than operator
   */
  static next<T> (data: T[], next?: string): ApiPagedResponse<T> {
    return new ApiPagedResponse<T>(data, next)
  }

  /**
   * @param {T[]} data array slice
   * @param {number} limit number of elements in the data array slice
   * @param {(item: T) => string} nextProvider to get next token when (limit === data array slice)
   */
  static of<T> (data: T[], limit: number, nextProvider: (item: T) => string): ApiPagedResponse<T> {
    if (data.length === limit) {
      const next = nextProvider(data[limit - 1])
      return this.next(data, next)
    }

    return this.next(data)
  }

  static empty<T> (): ApiPagedResponse<T> {
    return new ApiPagedResponse<T>([])
  }
}
