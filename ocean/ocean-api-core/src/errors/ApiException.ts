import { ApiResponse, ApiValidationException } from '@defichain/ocean-api-core'

export enum ApiErrorType {
  ValidationError = 'ValidationError',
  BadRequest = 'BadRequest',
  NotFound = 'NotFound',
  Conflict = 'Conflict',
  Forbidden = 'Forbidden',
  Unauthorized = 'Unauthorized',
  BadGateway = 'BadGateway',
  TimeoutError = 'TimeoutError',
  UnknownError = 'UnknownError',
}

export interface ApiError<T = any> {
  /**
   * @return {number} Status code
   */
  code: number
  type: ApiErrorType
  /**
   * @return {number} Milliseconds since Epoch
   */
  at: number
  message?: string
  url?: string
  payload: T
}

/**
 * Wrapped exception from ApiError
 */
export class ApiException<P = any> extends Error {
  constructor (readonly error: ApiError<P>) {
    super(ApiException.generateMessage(error))
  }

  private static generateMessage (error: ApiError): string {
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
  get type (): ApiErrorType {
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

  /**
   * @param {ApiResponse} response to check and raise error if any
   * @throws {ApiException} raised error
   */
  static raiseIfError (response: ApiResponse<any>): void {
    const error = response.error
    if (error === undefined) {
      return
    }

    if (typeof error === 'object') {
      if (error.code === 422 && error.type === ApiErrorType.ValidationError) {
        throw new ApiValidationException(error)
      }
      throw new ApiException(error)
    }

    throw new Error('Unrecognized Error: ' + JSON.stringify(response))
  }
}
