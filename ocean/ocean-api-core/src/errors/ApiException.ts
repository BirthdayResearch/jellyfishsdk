import { ApiError } from './ApiError'

/**
 * Wrapped exception from ApiError
 */
export class ApiException extends Error {
  constructor (readonly error: ApiError) {
    super(ApiException.generateMessage(error))
  }

  private static generateMessage (error: ApiError) {
    const url = error.url !== undefined && error.url !== null ? `(${error.url})` : ''
    const msg = error.message !== undefined && error.message !== null ? `: ${error.message}` : ''
    return `${error.code} - ${error.type} ${url} ${msg}`
  }

  /**
   * @return {number} error code
   */
  get code (): number {
    return this.error.code
  }

  /**
   * @return {string} error type
   */
  get type (): string {
    return this.error.type
  }

  /**
   * @return {number} time that error occurred at
   */
  get at (): number {
    return this.error.at
  }

  /**
   * @return {string} url that threw this endpoint
   */
  get url (): string | undefined {
    return this.error.url
  }
}
