import { ApiResponse } from '../whale.api.client'
import { WhaleApiValidationException } from './api.validation.exception'
import { WhaleApiErrorType, WhaleApiException } from './api.error'

export * from './api.validation.exception'
export * from './api.error'
export * from './client.timeout.exception'

/**
 * @param {ApiResponse} response to check and raise error if any
 * @throws {WhaleApiException} raised error
 */
export function raiseIfError (response: ApiResponse<any>): void {
  const error = response.error
  if (error === undefined) {
    return
  }

  if (error.code === 422 && error.type === WhaleApiErrorType.ValidationError) {
    throw new WhaleApiValidationException(error)
  }

  throw new WhaleApiException(error)
}
