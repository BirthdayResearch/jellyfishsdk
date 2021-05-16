import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiError as JellyfishApiError } from '@defichain/jellyfish-api-core'
import {
  ApiException,
  BadRequestApiException,
  NestJSApiException,
  UnknownApiException
} from '@src/module.api/_core/api.error'
import { isVersionPrefixed } from '@src/module.api/_core/api.version'

/**
 * Exception Interceptor to remap errors in module-api.
 */
@Injectable()
export class ExceptionInterceptor implements NestInterceptor {
  intercept (context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!isVersionPrefixed(context)) {
      return next.handle()
    }

    const url: string = context.switchToHttp().getRequest().raw?.url

    return next.handle().pipe(catchError(err => {
      return throwError(this.map(err).withUrl(url))
    }))
  }

  map (err: Error): ApiException {
    if (err instanceof ApiException) {
      return err
    }

    if (err instanceof HttpException) {
      return new NestJSApiException(err)
    }

    if (err instanceof JellyfishApiError) {
      return new BadRequestApiException(err.message)
    }

    return new UnknownApiException()
  }
}
