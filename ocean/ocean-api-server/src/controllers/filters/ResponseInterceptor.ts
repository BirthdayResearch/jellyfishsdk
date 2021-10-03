import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ApiPagedResponse, ApiResponse } from '@defichain/ocean-api-core'

/**
 * Transforms all response from module.api into a object {data:...}
 *
 * If ApiPagedResponse is provided, it will not transform that.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T> {
  intercept (context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    return next.handle().pipe(map((result): ApiResponse<any> => {
      if (result instanceof ApiPagedResponse) {
        return {
          data: [...result],
          page: result.page
        }
      }

      return { data: result }
    }))
  }
}
