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
export class ResponseInterceptor<T> implements NestInterceptor<T> {
  intercept (context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    if (!isVersionPrefixed(context)) {
      return next.handle()
    }

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

/**
 * @param {ExecutionContext} context to check if path is version prefixed
 * @return {boolean}
 */
export function isVersionPrefixed (context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest()
  const url: string = request.raw?.url
  return url.startsWith('/v')
}
