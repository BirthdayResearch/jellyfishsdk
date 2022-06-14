import { CallHandler, ExecutionContext, Logger, Module, NestInterceptor } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { catchError } from 'rxjs/operators'
import { Observable, throwError } from 'rxjs'

/**
 * A simple LoggingInterceptor to log errors.
 */
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name)

  intercept (context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(catchError(err => {
      this.logger.error(err.message, err.stack)
      return throwError(() => err)
    }))
  }
}

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor
    }
  ]
})
export class LoggingModule {
}
