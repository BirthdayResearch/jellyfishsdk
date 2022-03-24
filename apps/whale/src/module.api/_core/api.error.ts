import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Known api error type that DeFi whale will support.
 */
export enum ApiErrorType {
  // User specific errors
  ValidationError = 'ValidationError',
  BadRequest = 'BadRequest',
  NotFound = 'NotFound',
  Forbidden = 'Forbidden',
  Unauthorized = 'Unauthorized',

  // Resource conflict
  Conflict = 'Conflict',

  // Infrastructure errors
  BadGateway = 'BadGateway',
  TimeoutError = 'TimeoutError',

  // Default
  UnknownError = 'UnknownError',
}

export interface ApiError extends Record<string, any> {
  code: HttpStatus
  type: string
  at: number

  /**
   * Optional message to send out.
   */
  message?: string

  /**
   * Optional injected url that produced ApiError.
   * Injected by exception.interceptor.ts.
   */
  url?: string
}

export class ApiException extends HttpException {
  protected constructor (readonly apiError: ApiError) {
    super({ error: apiError }, apiError.code)
  }

  /**
   * @param {string} url to inject into ApiException
   * @return ApiException of the same instance
   */
  withUrl (url: string): ApiException {
    this.apiError.url = url
    return this
  }

  static with (status: HttpStatus, type: ApiErrorType, message?: string): ApiException {
    return new ApiException({
      code: status,
      type: type,
      message: message,
      at: Date.now()
    })
  }
}

export class NotFoundApiException extends ApiException {
  constructor (message?: string) {
    super({
      code: HttpStatus.NOT_FOUND,
      type: ApiErrorType.NotFound,
      at: Date.now(),
      message: message
    })
  }
}

export class BadRequestApiException extends ApiException {
  constructor (message?: string) {
    super({
      code: HttpStatus.BAD_REQUEST,
      type: ApiErrorType.BadRequest,
      at: Date.now(),
      message: message
    })
  }
}

export class UnknownApiException extends ApiException {
  constructor () {
    super({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      type: ApiErrorType.UnknownError,
      at: Date.now()
    })
  }
}

/**
 * Intercept NestJS exception and map into ApiException
 */
export class NestJSApiException extends ApiException {
  constructor (exception: HttpException) {
    super({
      code: NestJSApiException.mapCode(exception),
      type: NestJSApiException.mapType(exception),
      at: Date.now(),
      message: exception.message
    })
  }

  static mapCode (exception: HttpException): HttpStatus {
    switch (exception.getStatus()) {
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
      case HttpStatus.NOT_FOUND:
      case HttpStatus.UNAUTHORIZED:
      case HttpStatus.FORBIDDEN:
      case HttpStatus.CONFLICT:
        return exception.getStatus()

      case HttpStatus.GATEWAY_TIMEOUT:
      case HttpStatus.REQUEST_TIMEOUT:
        return HttpStatus.REQUEST_TIMEOUT

      case HttpStatus.BAD_GATEWAY:
      case HttpStatus.SERVICE_UNAVAILABLE:
        return HttpStatus.SERVICE_UNAVAILABLE

      default:
        return HttpStatus.INTERNAL_SERVER_ERROR
    }
  }

  static mapType (exception: HttpException): ApiErrorType {
    switch (exception.getStatus()) {
      case HttpStatus.BAD_REQUEST:
        return ApiErrorType.BadRequest

      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ApiErrorType.ValidationError

      case HttpStatus.NOT_FOUND:
        return ApiErrorType.NotFound

      case HttpStatus.CONFLICT:
        return ApiErrorType.Conflict

      case HttpStatus.UNAUTHORIZED:
        return ApiErrorType.Unauthorized

      case HttpStatus.FORBIDDEN:
        return ApiErrorType.Forbidden

      case HttpStatus.GATEWAY_TIMEOUT:
      case HttpStatus.REQUEST_TIMEOUT:
        return ApiErrorType.TimeoutError

      case HttpStatus.BAD_GATEWAY:
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ApiErrorType.BadGateway

      default:
        return ApiErrorType.UnknownError
    }
  }
}
