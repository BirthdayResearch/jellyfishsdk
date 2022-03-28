import { ApiPage } from '../../module.api/_core/api.paged.response'
import { ApiError } from '../../module.api/_core/api.error'

/**
 * Universal response structure for 'module.api'
 */
export interface ApiResponse {
  data?: any
  page?: ApiPage
  error?: ApiError
}

/* eslint-disable @typescript-eslint/no-extraneous-class */
/**
 * Raw Abstract ApiResponse class to bypass ResponseInterceptor.
 * Used by ApiPagedResponse to structure paged response structure.
 */
export abstract class ApiRawResponse implements ApiResponse {

}
