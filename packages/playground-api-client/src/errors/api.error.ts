export enum PlaygroundApiErrorType {
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

export interface PlaygroundApiError {
  code: number
  type: PlaygroundApiErrorType
  at: number
  message?: string
  url?: string
}

export class PlaygroundApiException extends Error {
  constructor (readonly error: PlaygroundApiError) {
    super(`${error.code} - ${error.type} ${PlaygroundApiException.url(error)}${PlaygroundApiException.message(error)}`)
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

  static url ({ url }: PlaygroundApiError): string {
    return url !== undefined && url !== null ? `(${url})` : ''
  }

  static message ({ message }: PlaygroundApiError): string {
    return message !== undefined && message !== null ? `: ${message}` : ''
  }
}
