import { ApiPage } from './api.paged.response'
import { ApiError } from './api.error'

/**
 * Universal response structure for 'module.api'
 */
export interface ApiResponse {
  data?: any
  page?: ApiPage
  error?: ApiError
}
