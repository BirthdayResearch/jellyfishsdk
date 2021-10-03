import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { ApiError, ApiErrorType, ApiException } from '@defichain/ocean-api-core'

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name)

  catch (err: Error, host: ArgumentsHost): any {
    this.logger.error(err)

    const ctx = host.switchToHttp()
    const url: string = ctx.getRequest().raw?.url
    const response = ctx.getResponse()

    const apiError = mapError(err, url)
    response.status(apiError.code)
      .send({ error: apiError })
  }
}

function mapError (err: Error, url: string): ApiError {
  if (err instanceof ApiException) {
    return {
      code: err.code,
      type: err.type,
      at: err.at,
      message: err.message,
      url: url,
      payload: undefined
    }
  }

  if (err instanceof HttpException) {
    return {
      code: mapErrorCode(err),
      type: mapErrorType(err),
      at: Date.now(),
      message: err.message,
      url: url,
      payload: undefined
    }
  }

  // TODO(fuxingloh): HealthCheck Error?

  return {
    code: HttpStatus.INTERNAL_SERVER_ERROR,
    type: ApiErrorType.UnknownError,
    at: Date.now(),
    url: url,
    payload: undefined
  }
}

function mapErrorCode (exception: HttpException): HttpStatus {
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

function mapErrorType (exception: HttpException): ApiErrorType {
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
