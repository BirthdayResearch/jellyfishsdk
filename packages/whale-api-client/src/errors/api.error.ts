export enum WhaleApiErrorType {
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

export interface WhaleApiError {
  code: number
  type: WhaleApiErrorType
  at: number
  message?: string
  url?: string
}

/**
 * Serialized exception from DeFi Whale
 */
export class WhaleApiException extends Error {
  constructor (readonly error: WhaleApiError) {
    super(`${error.code} - ${error.type} ${WhaleApiException.url(error)}${WhaleApiException.message(error)}`)
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

  static url ({ url }: WhaleApiError): string {
    return url !== undefined && url !== null ? `(${url})` : ''
  }

  static message ({ message }: WhaleApiError): string {
    return message !== undefined && message !== null ? `: ${message}` : ''
  }
}
