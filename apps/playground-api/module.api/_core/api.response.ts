import { ApiError } from './api.error'

/**
 * Universal response structure for 'module.api'
 */
export interface ApiResponse {
  data?: any
  error?: ApiError
}
