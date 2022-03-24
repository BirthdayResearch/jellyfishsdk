import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiError as JellyfishApiError } from '@defichain/jellyfish-api-core'
import {
  ApiException,
  BadRequestApiException,
  NestJSApiException,
  UnknownApiException
} from '../../module.api/_core/api.error'
import { isVersionPrefixed } from '../../module.api/_core/api.version'

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
        return this.map(err).withUrl(url)
      })
    }))
  }

  map (err: Error): ApiException {
    if (err instanceof ApiException) {
      this.logger.error(err.apiError)
      return err
    }

    if (err instanceof HttpException) {
      this.logger.error(err.message, err.stack)
      return new NestJSApiException(err)
    }

    if (err instanceof JellyfishApiError) {
      this.logger.error(err.message, err.stack)
      return new BadRequestApiException(err.message)
    }

    this.logger.error(err)
    return new UnknownApiException()
  }
}
