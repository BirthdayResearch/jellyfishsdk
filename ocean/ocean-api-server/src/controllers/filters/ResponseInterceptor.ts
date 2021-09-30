import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ApiPagedResponse, ApiResponse } from '@defichain/ocean-api-core/src'

/**
 * Transforms all response from module.api into a object {data:...}
 *
 * If ApiPagedResponse is provided, it will not transform that.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse> {
  intercept (context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse> {
    if (!isVersionPrefixed(context)) {
      return next.handle()
    }

    return next.handle().pipe(map(result => {
      if (result instanceof ApiPagedResponse) {
        return result
      }

      return { data: result }
    }))
  }
}
