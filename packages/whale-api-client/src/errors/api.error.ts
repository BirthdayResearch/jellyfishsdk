import { HttpStatus } from '@nestjs/common'

export enum WhaleApiErrorType {
  ValidationError = 'ValidationError',
  BadRequest = 'BadRequest',
  NotFound = 'NotFound',
  Forbidden = 'Forbidden',
  Unauthorized = 'Unauthorized',
  BadGateway = 'BadGateway',
  TimeoutError = 'TimeoutError',
  UnknownError = 'UnknownError',
}

export interface WhaleApiError {
  code: HttpStatus
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

  static url ({ url }: WhaleApiError): string {
    return url !== undefined && url !== null ? `(${url})` : ''
  }

  static message ({ message }: WhaleApiError): string {
    return message !== undefined && message !== null ? `: ${message}` : ''
  }
}
