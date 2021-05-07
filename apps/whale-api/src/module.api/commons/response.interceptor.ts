import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { SliceResponse } from '@src/module.api/commons/slice.response'

/**
 * Universal response structure for 'module.api'
 */
export interface Response {
  data?: any
  page?: {
    next?: string
  }
}

/**
 * Transforms all response from module.api into a object {data:...}
 *
 * If SliceResponse is provided, it will not transform that.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response> {
  intercept (context: ExecutionContext, next: CallHandler<T>): Observable<Response> {
    return next.handle().pipe(map(result => {
      if (result instanceof SliceResponse) {
        return result
      }

      return { data: result }
    }))
  }
}
