import { ApiPage } from '@src/module.api/_core/api.paged.response'
import { ApiError } from '@src/module.api/_core/api.error'

/**
 * Universal response structure for 'module.api'
 */
export interface ApiResponse {
  data?: any
  page?: ApiPage
  error?: ApiError
}
