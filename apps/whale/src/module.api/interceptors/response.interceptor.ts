import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ApiPage, ApiSliceResponse } from '@src/module.api/interceptors/api.slice.response'
import { ApiError } from '@src/module.api/interceptors/api.error'

/**
 * Universal response structure for 'module.api'
 */
export interface ApiResponse {
  data?: any
  page?: ApiPage
  error?: ApiError
}

/**
 * Transforms all response from module.api into a object {data:...}
 *
 * If ApiSliceResponse is provided, it will not transform that.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse> {
  intercept (context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse> {
    return next.handle().pipe(map(result => {
      if (result instanceof ApiSliceResponse) {
        return result
      }

      return { data: result }
    }))
  }
}
