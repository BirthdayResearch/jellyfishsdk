import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiError } from '@defichain/jellyfish-api-core'

/**
 * Exception Interceptor to remap errors in module-api.
 */
@Injectable()
export class ExceptionInterceptor implements NestInterceptor {
  intercept (context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(catchError(err => {
      return throwError(this.handleError(err))
    }))
  }

  handleError (err: Error): Error {
    if (err instanceof ApiError) {
      return new BadRequestException(err.message)
    }
    return err
  }
}
