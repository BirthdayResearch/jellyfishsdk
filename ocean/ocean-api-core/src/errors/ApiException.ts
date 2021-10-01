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
  code: number
  type: ApiErrorType
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
}
