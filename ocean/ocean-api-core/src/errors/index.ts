import { ApiValidationException } from './ApiValidationException'
import { ApiErrorType, ApiException } from './ApiException'
import { ApiResponse } from '../ApiResponse'

export * from './ApiException'
export * from './ApiValidationException'
export * from './ClientException'
export * from './TimeoutException'

/**
 * @param {ApiResponse} response to check and raise error if any
 * @throws {ApiException} raised error
 */
export function raiseIfError (response: ApiResponse<any>): void {
  const error = response.error
  if (error === undefined) {
    return
  }

  if (error.code === 422 && error.type === ApiErrorType.ValidationError) {
    throw new ApiValidationException(error)
  }

  throw new ApiException(error)
}
