import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor
} from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { isVersionPrefixed } from './ResponseInterceptor'
import { ApiErrorType, ApiException } from '@defichain/ocean-api-core'

/**
 * Exception Interceptor to remap errors in module-api.
 */
@Injectable()
export class ExceptionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ExceptionInterceptor.name)

  intercept (context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!isVersionPrefixed(context)) {
      return next.handle()
    }

    const url: string = context.switchToHttp().getRequest().raw?.url

    return next.handle().pipe(catchError(err => {
      this.logger.error(err)

      return throwError(() => {
        return this.map(err, url)
      })
    }))
  }

  map (err: Error, url: string): ApiException {
    if (err instanceof ApiException) {
      return new ApiException({
        code: err.code,
        type: err.type,
        at: err.at,
        message: err.message,
        url: url
      })
    }

    if (err instanceof HttpException) {
      return new NestJSApiException(err, url)
    }

    return new UnknownApiException(url)
  }
}

/**
 * Intercept NestJS exception and map into ApiException
 */
export class NestJSApiException extends ApiException {
  constructor (exception: HttpException, url: string) {
    super({
      code: NestJSApiException.mapCode(exception),
      type: NestJSApiException.mapType(exception),
      at: Date.now(),
      message: exception.message,
      url: url
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

export class UnknownApiException extends ApiException {
  constructor (url: string) {
    super({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      type: ApiErrorType.UnknownError,
      at: Date.now(),
      url: url
    })
  }
}
